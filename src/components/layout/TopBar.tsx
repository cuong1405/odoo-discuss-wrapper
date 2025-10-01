import React from 'react';
import { MessageSquare, Search, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { Avatar } from '../ui/Avatar';

export const TopBar: React.FC = () => {
  const user = useAuthStore(state => state.user);

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#611f69] text-white z-50 safe-area-pt shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#e8912d] rounded-lg p-1.5 flex items-center justify-center shadow-sm">
            <MessageSquare size={20} strokeWidth={2.5} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Discuss</h1>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="ring-2 ring-white/20 rounded-full">
              <Avatar
                src={user.avatar}
                alt={user.name}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#4a154b] text-white placeholder-white/50 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-200"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors duration-200">
            <Menu size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
