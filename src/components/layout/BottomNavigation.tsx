import React from 'react';
import { 
  Inbox, 
  Star, 
  Clock, 
  Hash, 
  MessageCircle,
  Circle
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAppStore } from '../../store/app-store';

interface BottomNavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange
}) => {
  const getUnreadCount = useAppStore(state => state.getUnreadCount);
  const unreadCount = getUnreadCount();

  const tabs = [
    {
      id: 'inbox' as NavigationTab,
      label: 'Inbox',
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: 'recent' as NavigationTab,
      label: 'Recent',
      icon: Clock,
      badge: undefined
    },
    {
      id: 'starred' as NavigationTab,
      label: 'Starred',
      icon: Star,
      badge: undefined
    },
    {
      id: 'channels' as NavigationTab,
      label: 'Channels',
      icon: Hash,
      badge: undefined
    },
    {
      id: 'direct' as NavigationTab,
      label: 'Direct',
      icon: MessageCircle,
      badge: undefined
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative 
                flex 
                flex-col 
                items-center 
                justify-center 
                p-2 
                min-w-0 
                flex-1 
                rounded-lg 
                transition-all 
                duration-200
                ${isActive 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  className={`
                    transition-all 
                    duration-200
                    ${isActive ? 'stroke-2' : 'stroke-1.5'}
                  `} 
                />
                {tab.badge && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </div>
                )}
              </div>
              <span 
                className={`
                  text-xs 
                  font-medium 
                  mt-1 
                  transition-all 
                  duration-200
                  ${isActive ? 'text-indigo-600' : 'text-gray-500'}
                `}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
