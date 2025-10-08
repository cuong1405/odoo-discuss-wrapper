import { VercelRequest, VercelResponse } from "@vercel/node";
import httpProxy from "http-proxy";

// Disable the default body parser, so we can stream the body
export const config = {
  api: {
    bodyParser: false,
  },
};

const proxy = httpProxy.createProxyServer({
  // IMPORTANT: We need to handle the session cookie
  changeOrigin: true,
  selfHandleResponse: false, // Let http-proxy handle the response streaming
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Get the Odoo server URL from the custom header
  const target = req.headers["x-target-url"] as string;
  if (!target) {
    return res.status(400).send("X-Target-URL header is required.");
  }

  // Remove the '/api' prefix from the request URL
  req.url = req.url.replace(/^\/api/, "");

  // Promise wrapper to handle errors
  return new Promise<void>((resolve, reject) => {
    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
      if (err) {
        console.error("Proxy Error:", err);
        res.status(500).send("Proxy Error");
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
