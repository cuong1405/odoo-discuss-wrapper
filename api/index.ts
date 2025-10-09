import { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";
import cookie from "cookie";
import { randomBytes } from "crypto";
import fetch, { Headers } from "node-fetch";

const PROXY_SESSION_COOKIE = "proxy-session-id";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Get or create a unique session ID for the browser
  const cookies = cookie.parse(req.headers.cookie || "");
  let sessionId = cookies[PROXY_SESSION_COOKIE];

  if (!sessionId) {
    sessionId = randomBytes(16).toString("hex");
    // Send this new session ID back to the browser in a secure cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize(PROXY_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      }),
    );
  }

  // 2. Prepare the request to forward to Odoo
  const targetUrl = req.headers["x-target-url"] as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "X-Target-URL header is required." });
  }

  const path = (req.query.path as string[]).join("/");
  const odooRequestUrl = `${targetUrl}/${path}`;

  const fwdHeaders = new Headers();
  fwdHeaders.set("Content-Type", "application/json");
  fwdHeaders.set("Accept", "application/json");
  if (req.headers["x-odoo-database"]) {
    fwdHeaders.set("X-Odoo-Database", req.headers["x-odoo-database"] as string);
  }

  // 3. CRITICAL: Retrieve the Odoo session_id from our KV store
  const odooSessionId = await kv.get<string>(sessionId);
  if (odooSessionId) {
    fwdHeaders.set("Cookie", `session_id=${odooSessionId}`);
  }

  try {
    // 4. Make the request to Odoo
    const odooResponse = await fetch(odooRequestUrl, {
      method: req.method,
      headers: fwdHeaders,
      body: req.body ? JSON.stringify(req.body) : null,
    });

    // 5. CRITICAL: Check if Odoo sent back a new session cookie
    const setCookieHeader = odooResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      const newOdooSessionId = setCookieHeader.match(/session_id=([^;]+)/);
      if (newOdooSessionId) {
        // We found a new Odoo session_id. Store it in our KV database.
        await kv.set(sessionId, newOdooSessionId[1], { ex: 60 * 60 * 24 * 7 }); // Expires in 1 week
      }
    }

    // 6. Forward Odoo's response back to the client
    res.status(odooResponse.status);
    const data = await odooResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Proxy Error" });
  }
}
