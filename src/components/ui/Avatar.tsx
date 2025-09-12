import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  user: {
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showOnlineStatus?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  showOnlineStatus = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3 h-3'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          overflow-hidden 
          bg-gradient-to-br 
          from-indigo-500 
          to-purple-600
          flex 
          items-center 
          justify-center 
          text-white 
          font-medium
          ring-2
          ring-white
          shadow-sm
        `}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(user.name)}</span>
        )}
      </div>
      
      {showOnlineStatus && (
        <div
          className={`
            absolute 
            -bottom-0.5 
            -right-0.5 
            ${statusSizes[size]}
            rounded-full 
            border-2 
            border-white
            ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  );
};