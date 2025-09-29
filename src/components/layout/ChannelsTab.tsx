import React from "react";
import { useAppStore } from "../../store/app-store";

export const ChannelsTab: React.FC = () => {
    const channels = useAppStore(state => state.channels);
    const isLoading = useAppStore(state => state.isLoading);

    const memberChannels = Object.values(channels).filter(ch => ch.isMember);

    if (isLoading) return <div>Loading channels...</div>;

    return (
        <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Channels</h2>
      {memberChannels.length === 0 && <div>No channels found.</div>}
      <ul>
        {memberChannels.map(channel => (
          <li key={channel.id} className="flex items-center gap-2 py-2">
            {channel.avatar && (
              <img src={channel.avatar} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span>{channel.name}</span>
            {channel.isArchived && <span className="text-xs text-gray-400 ml-2">(archived)</span>}
          </li>
        ))}
      </ul>
    </div>
    );
};