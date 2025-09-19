import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Star, StarOff } from 'lucide-react';
import { Message, User } from '../../types';
import { Avatar } from '../ui/Avatar';

interface MessageListProps {
  messages: Message[];
  users: Record<number, User>;
  onToggleStar: (messageId: number) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  users,
  onToggleStar,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-500 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <p>No messages yet</p>
          <p className="text-sm">Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {messages.map((message, index) => {
        const author = users[message.authorId];
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAvatar = !prevMessage || prevMessage.authorId !== message.authorId;
        const isConsecutive = prevMessage && 
          prevMessage.authorId === message.authorId &&
          (message.createdAt.getTime() - prevMessage.createdAt.getTime()) < 5 * 60 * 1000; // 5 minutes

        return (
          <div
            key={message.id}
            className={`flex gap-3 group hover:bg-gray-50 -mx-4 px-4 py-1 rounded-lg transition-colors ${
              isConsecutive ? 'mt-1' : 'mt-4'
            }`}
          >
            <div className="flex-shrink-0 w-10">
              {showAvatar && author ? (
                <Avatar
                  user={author}
                  size="sm"
                  showOnlineStatus={true}
                />
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {showAvatar && (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {author?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(message.createdAt, 'MMM d, h:mm a')}
                  </span>
                </div>
              )}
              
              <div className="text-gray-800 text-sm leading-relaxed break-words">
                {message.content}
              </div>
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  📎 {message.attachments.length} attachment(s)
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggleStar(message.id)}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                  message.isStarred ? 'text-yellow-500' : 'text-gray-400'
                }`}
                title={message.isStarred ? 'Remove star' : 'Add star'}
              >
                {message.isStarred ? (
                  <Star size={16} fill="currentColor" />
                ) : (
                  <StarOff size={16} />
                )}
              </button>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};