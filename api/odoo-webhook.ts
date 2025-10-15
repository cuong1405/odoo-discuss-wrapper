import type { VercelRequest, VercelResponse } from "@vercel/node";

let clients: VercelResponse[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    // SSE Connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    clients.push(res);
    console.log(`Client connected (${clients.length})`);

    req.on("close", () => {
      clients = clients.filter((client) => client !== res);
      console.log(`Client disconnected (${clients.length})`);
    });
    return;
  }

  if (req.method === "POST") {
    try {
      const data = req.body;

      console.log("Received webhook payload: ", data);

      // Validate webhook payload
      if (!data || !data._model || !data._id) {
        return res.status(400).json({
          error: "Invalid payload",
        });
      }

      // Function to receive new message
      if (data._model === "mail.message") {
        const newMessage = {
          id: data._id,
          content: data.body || "",
          authorId: data.author_id || "Unknown",
          channelId: data.res_id,
          createdAt: new Date(data.date),
        };

        console.log("New message received:", newMessage);

        clients.forEach((client) =>
          client.write(`data: ${JSON.stringify(newMessage)}\n\n`),
        );
      }

      return res.status(200).json({
        ok: true,
      });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({
        error: "Internal Server Error",
      });
    }
  }

  return res.status(405).json({
    error: "Method not allowed",
  });
}
