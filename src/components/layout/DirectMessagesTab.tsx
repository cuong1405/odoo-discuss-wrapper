import React from 'react';
import { useAppStore } from '../../store/app-store';
import { Avatar } from '../ui/Avatar';

export const DirectMessagesTab: React.FC = () => {
  const { directChannels, setCurrentChannel, loadMessages, messages } = useAppStore();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Direct Messages</h1>
      <div>
        {Object.values(directChannels).length === 0 && (
          <div className="text-gray-500">No direct messages yet.</div>
        )}
        {Object.values(directChannels).map(channel => (
          <div
            key={channel.id}
            className="mb-2 cursor-pointer"
            onClick={() => {
              setCurrentChannel(channel.id);
              loadMessages(channel.id);
            }}
          >
            <Avatar user={{ name: channel.name, avatar: channel.avatar }} size="md" />
            <div className="font-semibold">{channel.name}</div>
            {/* Optionally show last message, unread count, etc. */}
          </div>
        ))}
      </div>
    </div>
  );
};
