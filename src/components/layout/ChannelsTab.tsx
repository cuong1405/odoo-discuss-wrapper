import React from "react";
import { useAppStore } from "../../store/app-store";
import { Hash } from "lucide-react";
import { ChatView } from "../messages/ChatView";
import { LoadingSpinner } from "../ui/LoadingSpinner";

export const ChannelsTab: React.FC = () => {
  const channels = useAppStore(state => state.channels);
  const currentChannelId = useAppStore(state => state.currentChannelId);
  const setCurrentChannel = useAppStore(state => state.setCurrentChannel);
  const isLoading = useAppStore(state => state.isLoading);

  const memberChannels = Object.values(channels).filter(ch => ch.isMember);

  if (currentChannelId) {
    const channel = channels[currentChannelId];
    if (channel) {
      return (
        <div className="fixed inset-0 z-50 bg-white animate-slide-in">
          <ChatView
            channel={channel}
            onBack={() => setCurrentChannel(null)}
          />
        </div>
      );
    }
  }

  if (isLoading && memberChannels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
      </div>

      {memberChannels.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <div className="text-4xl mb-2">📢</div>
          <p>No channels found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {memberChannels.map(channel => (
            <div
              key={channel.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setCurrentChannel(channel.id)}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Hash size={20} className="text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {channel.name}
                  </h3>
                  {channel.isArchived && (
                    <span className="text-xs text-gray-400">(archived)</span>
                  )}
                </div>
                {channel.description && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {channel.description}
                  </p>
                )}
              </div>

              {channel.unreadCount && channel.unreadCount > 0 && (
                <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {channel.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};