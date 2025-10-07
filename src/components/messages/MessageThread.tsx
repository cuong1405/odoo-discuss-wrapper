import React, { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Message, User } from '../../types';
import { Avatar } from '../ui/Avatar';

interface MessageThreadProps {
  messages: Message[];
  users: Record<number, User>;
  currentUserId: number;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  users,
  currentUserId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const sortedMessages = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-4 space-y-4">
      {sortedMessages.map((message, index) => {
        const author = users[message.authorId];
        const isCurrentUser = message.authorId === currentUserId;
        const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
        const showAvatar =
          !prevMessage ||
          prevMessage.authorId !== message.authorId ||
          message.createdAt.getTime() - prevMessage.createdAt.getTime() > 300000;

        return (
          <div key={message.id} className="flex gap-3">
            <div className="flex-shrink-0 w-9">
              {showAvatar && author && (
                <Avatar user={author} size="md" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {showAvatar && (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">
                    {author?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              )}

              <div className="text-gray-900 text-sm leading-relaxed break-words">
                {stripHtml(message.content)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
