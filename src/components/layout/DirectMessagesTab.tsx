import React from "react";
import { useAppStore } from "../../store/app-store";
import { Avatar } from "../ui/Avatar";
import { ChatView } from "../messages/ChatView";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Users } from "lucide-react";

export const DirectMessagesTab: React.FC = () => {
  const {
    directChannels,
    currentChannelId,
    setCurrentChannel,
    users,
    isLoading,
  } = useAppStore();

  const getChannelDisplayInfo = (channel: any) => {
    if (channel.type === "group") {
      return {
        name: channel.name,
        avatar: channel.avatar,
        isGroup: true,
      };
    } else if (channel.type === "chat") {
      const otherUserId = channel.otherUserId;
      const otherUser = users[otherUserId];

      return {
        name: otherUser ? otherUser.name : "Unknown User",
        avatar: otherUser ? otherUser.avatar : undefined,
        isGroup: false,
      };
    }

    return {
      name: channel.name,
      avatar: channel.avatar,
      isGroup: false,
    };
  };

  const channelsList = Object.values(directChannels);

  if (currentChannelId) {
    const channel = directChannels[currentChannelId];
    if (channel) {
      return (
        <div className="h-[calc(100vh-140px-64px)]">
          <ChatView
            channel={channel}
            onBack={() => setCurrentChannel(null)}
          />
        </div>
      );
    }
  }

  if (isLoading && channelsList.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Direct Messages</h1>
      </div>

      {channelsList.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p>No direct messages yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {channelsList.map((channel) => {
            const displayInfo = getChannelDisplayInfo(channel);
            return (
              <div
                key={channel.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setCurrentChannel(channel.id)}
              >
                {displayInfo.isGroup ? (
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                ) : (
                  <Avatar
                    user={{
                      name: displayInfo.name,
                      avatar: displayInfo.avatar,
                    }}
                    size="lg"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {displayInfo.name}
                  </h3>
                  {displayInfo.isGroup && channel.memberIds && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {channel.memberIds.length} members
                    </p>
                  )}
                </div>

                {channel.unreadCount && channel.unreadCount > 0 && (
                  <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {channel.unreadCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
