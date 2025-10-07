import React from "react";
import { useAppStore } from "../../store/app-store";
import { Avatar } from "../ui/Avatar";

export const DirectMessagesTab: React.FC = () => {
  const { directChannels, setCurrentChannel, loadMessages, users } =
    useAppStore();

  const getChannelDisplayInfo = (channel: any) => {
    if (channel.type == "group") {
      // Display channel's info for group chats
      return {
        name: channel.name,
        avatar: channel.avatar,
      };
    } else if (channel.type == "chat") {
      // Display other user's info for direct chats
      const otherUserId = channel.otherUserId;
      const otherUser = users[otherUserId];

      return {
        name: otherUser ? otherUser.name : "Unknown User",
        avatar: otherUser ? otherUser.avatar : undefined,
      };
    }

    // Fallback
    return {
      name: channel.name,
      avatar: channel.avatar,
    };
  };

  const handleChannelClick = (channelId: number) => {
    setCurrentChannel(channelId);
    loadMessages(channelId);
  };

  const channelsList = Object.values(directChannels);

  if (channelsList.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Direct Messages
        </h1>
        <div className="text-gray-500">No direct messages yet.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Direct Messages</h1>
      <div>
        {channelsList.map((channel) => {
          const displayInfo = getChannelDisplayInfo(channel);
          return (
            <div
              key={channel.id}
              className="flex items-center mb-2 cursor-pointer p-2 rounded-md hover:bg-gray-100"
              onClick={() => handleChannelClick(channel.id)}
            >
              <Avatar
                user={{ name: displayInfo.name, avatar: displayInfo.avatar }}
                size="md"
              />
              <div className="font-semibold ml-3">{displayInfo.name}</div>
              {/* Optionally show last message, unread count, etc. */}
            </div>
          );
        })}
      </div>
    </div>
  );
};
