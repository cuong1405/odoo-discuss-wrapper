import { useEffect } from "react";
import { useAppStore } from "../store/app-store";

export function SseListener() {
  useEffect(() => {
    const eventSource = new EventSource("/api/odoo-webhook");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("New message received from Odoo webhook:", data);

        useAppStore.setState((state) => {
          const channelId = data.res_id;
          const channelMessages = state.messages[channelId] || [];

          const newMessage = {
            id: data._id,
            content: data.body || "",
            authorId: Array.isArray(data.author_id)
              ? data.author_id[0]
              : data.author_id || 0,
            channelId,
            createdAt: new Date(data.date),
            isStarred: false,
          };

          return {
            messages: {
              ...state.messages,
              [channelId]: [...channelMessages, newMessage],
            },
          };
        });
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    return () => {
      eventSource.close();
      console.log("SSE connection closed");
    };
  }, []);

  return null;
}
