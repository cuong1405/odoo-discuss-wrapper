import { VercelRequest, VercelResponse } from "@vercel/node";
import { withIronSessionApiRoute } from "iron-session/vercel";
import fetch, { Headers } from "node-fetch";

// This is the core of the solution. We wrap our handler with iron-session.
export default withIronSessionApiRoute(proxyHandler, {
  cookieName: "odoo-proxy-session", // A new cookie your browser will store
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

async function proxyHandler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = req.headers["x-target-url"] as string;
  if (!targetUrl) {
    return res.status(400).send("X-Target-URL header is missing.");
  }

  // The full path to the Odoo endpoint
  const odooRequestUrl = `${targetUrl}${req.url.replace(/^\/api/, "")}`;

  // Prepare headers to forward to Odoo
  const fwdHeaders = new Headers();
  fwdHeaders.set("Content-Type", "application/json");
  fwdHeaders.set("Accept", "application/json");
  if (req.headers["x-odoo-database"]) {
    fwdHeaders.set("X-Odoo-Database", req.headers["x-odoo-database"] as string);
  }

  // **CRITICAL**: If we have a stored session_id, add it to the request to Odoo
  if (req.session.odooSessionId) {
    fwdHeaders.set("Cookie", `session_id=${req.session.odooSessionId}`);
  }

  try {
    const odooResponse = await fetch(odooRequestUrl, {
      method: req.method,
      headers: fwdHeaders,
      body: JSON.stringify(req.body),
    });

    // **CRITICAL**: Check if Odoo sent back a new session cookie
    const setCookieHeader = odooResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      const match = setCookieHeader.match(/session_id=([^;]+)/);
      if (match) {
        // We found a session_id. Encrypt and save it in our iron-session.
        req.session.odooSessionId = match[1];
        await req.session.save();
      }
    }

    // Forward Odoo's response back to the client
    res.status(odooResponse.status);
    const data = await odooResponse.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Proxy Error" });
  }
}
