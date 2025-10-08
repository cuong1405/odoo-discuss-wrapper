import React, { useEffect } from "react";
import { ArrowLeft, Hash, MoreVertical, Phone, Video } from "lucide-react";
import { Channel, User } from "../../types";
import { useAppStore } from "../../store/app-store";
import { useAuthStore } from "../../store/auth-store";
import { MessageThread } from "./MessageThread";
import { MessageInput } from "./MessageInput";
import { Avatar } from "../ui/Avatar";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface ChatViewProps {
  channel: Channel;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ channel, onBack }) => {
  const { messages, users, loadMessages, sendMessage, isLoading } =
    useAppStore();
  const currentUser = useAuthStore((state) => state.user);

  const channelMessages = messages[channel.id] || [];

  useEffect(() => {
    loadMessages(channel.id);
  }, [channel.id, loadMessages]);

  const handleSendMessage = async (content: string) => {
    await sendMessage(channel.id, content);
  };

  const getDisplayInfo = () => {
    if (channel.type === "chat" && channel.otherUserId) {
      const otherUser = users[channel.otherUserId];
      return {
        name: otherUser?.name || "Unknown User",
        avatar: otherUser?.avatar,
        isUser: true,
      };
    }
    return {
      name: channel.name,
      avatar: channel.avatar,
      isUser: false,
    };
  };

  const displayInfo = getDisplayInfo();

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>

          {displayInfo.isUser ? (
            <Avatar
              user={{ name: displayInfo.name, avatar: displayInfo.avatar }}
              size="md"
            />
          ) : (
            <div className="flex-shrink-0 w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Hash size={18} className="text-blue-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base truncate">
              {displayInfo.name}
            </h1>
            {channel.type === "channel" && channel.memberIds && (
              <p className="text-xs text-gray-500">
                {channel.memberIds.length} members
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Phone size={18} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Video size={18} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {isLoading && channelMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : channelMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 px-4">
            <div className="text-4xl mb-2">��</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to send a message!</p>
          </div>
        </div>
      ) : (
        <MessageThread
          messages={channelMessages}
          users={users}
          currentUserId={currentUser?.id || 0}
        />
      )}

      <MessageInput
        onSendMessage={handleSendMessage}
        placeholder={`Message ${displayInfo.name}`}
      />
    </div>
  );
};
