import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

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

      // Implement logic to store message later
    }

    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({
      error: "Server error:",
    });
  }
}
