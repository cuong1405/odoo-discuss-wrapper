import React, { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Star, Hash, MessageCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/app-store';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Message } from '../../types';

export const RecentMessagesList: React.FC = () => {
  const { 
    recentMessages, 
    users, 
    channels, 
    isLoading, 
    error,
    loadRecentMessages,
    toggleStarMessage,
    setCurrentChannel,
    setCurrentTab
  } = useAppStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadRecentMessages();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadRecentMessages]);

  const handleMessageClick = useCallback((message: Message) => {
    if (message.channelId) {
      setCurrentChannel(message.channelId);
      setCurrentTab('channels');
    }
  }, [setCurrentChannel, setCurrentTab]);

  const handleStarToggle = useCallback((messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarMessage(messageId);
  }, [toggleStarMessage]);

  const getMessageAuthor = useCallback((authorId: number) => {
    return users[authorId] || { 
      id: authorId, 
      name: 'Unknown User', 
      email: '', 
      isOnline: false 
    };
  }, [users]);

  const getChannelInfo = useCallback((channelId: number) => {
    return channels[channelId] || { 
      id: channelId, 
      name: 'Unknown Channel', 
      type: 'channel' as const,
      memberIds: [],
      unreadCount: 0,
      isArchived: false
    };
  }, [channels]);

  const formatMessageContent = useCallback((content: string) => {
    if (content.length > 100) {
      return content.substring(0, 100) + '...';
    }
    return content;
  }, []);

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 mb-2">Failed to load recent messages</p>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-semibold text-gray-900">Recent Messages</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw 
            size={20} 
            className={`${isRefreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && recentMessages.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : recentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No recent messages</p>
            <p className="text-sm text-center">
              Your recent messages will appear here once you start chatting
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentMessages.map((message) => {
              const author = getMessageAuthor(message.authorId);
              const channel = getChannelInfo(message.channelId);
              
              return (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar 
                      user={author} 
                      size="sm" 
                      showOnlineStatus={true}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {author.name}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {channel.type === 'channel' ? (
                            <Hash size={12} />
                          ) : (
                            <MessageCircle size={12} />
                          )}
                          <span>{channel.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {formatMessageContent(message.content)}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => handleStarToggle(message.id, e)}
                      className={`p-1 rounded transition-colors ${
                        message.isStarred
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Star 
                        size={16} 
                        className={message.isStarred ? 'fill-current' : ''} 
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
