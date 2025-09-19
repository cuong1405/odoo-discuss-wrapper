import { create } from 'zustand';
import { AppState, User, Channel, Message, NavigationTab } from '../types';
import { odooAPI } from '../services/odoo-api';
import { dbOperations } from '../db';
import { notificationService } from '../services/notification-service';
import { webSocketService } from '../services/websocket-service';

interface AppStore extends AppState {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  setCurrentChannel: (channelId: number | null) => void;
  setRealTimeConnected: (isConnected: boolean) => void;
  loadUsers: () => Promise<void>;
  loadChannels: () => Promise<void>;
  loadMessages: (channelId: number) => Promise<void>;
  sendMessage: (channelId: number, content: string) => Promise<void>;
  toggleStarMessage: (messageId: number) => Promise<void>;
  setOfflineStatus: (isOffline: boolean) => void;
  getUnreadCount: () => number;
  getStarredMessages: () => Message[];
  loadRecentMessages: () => Promise<void>;
  initializeRealTime: (serverUrl: string, token: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  users: {},
  channels: {},
  messages: {},
  currentChannelId: null,
  currentTab: 'inbox',
  isLoading: false,
  error: null,
  isOffline: false,
  isRealTimeConnected: false,

  setCurrentTab: (tab: NavigationTab) => {
    set({ currentTab: tab });
  },

  setCurrentChannel: (channelId: number | null) => {
    set({ currentChannelId: channelId });
    if (channelId) {
      get().loadMessages(channelId);
    }
  },

  setRealTimeConnected: (isConnected: boolean) => {
    set({ isRealTimeConnected: isConnected });
  },

  loadUsers: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to load from cache first
      const cachedUsers = await dbOperations.getAllUsers();
      if (cachedUsers.length > 0) {
        const usersMap = cachedUsers.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<number, User>);
        set({ users: usersMap });
      }

      // Then fetch fresh data
      const users = await odooAPI.getUsers();
      const usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<number, User>);

      // Save to cache
      await dbOperations.saveUsers(users);
      
      set({ users: usersMap, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load users',
        isLoading: false 
      });
    }
  },

  loadChannels: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to load from cache first
      const cachedChannels = await dbOperations.getChannels();
      if (cachedChannels.length > 0) {
        const channelsMap = cachedChannels.reduce((acc, channel) => {
          acc[channel.id] = channel;
          return acc;
        }, {} as Record<number, Channel>);
        set({ channels: channelsMap });
      }

      // Then fetch fresh data
      const channels = await odooAPI.getChannels();
      const channelsMap = channels.reduce((acc, channel) => {
        acc[channel.id] = channel;
        return acc;
      }, {} as Record<number, Channel>);

      // Save to cache
      await dbOperations.saveChannels(channels);
      
      set({ channels: channelsMap, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load channels',
        isLoading: false 
      });
    }
  },

  loadMessages: async (channelId: number) => {
    try {
      const state = get();
      set({ isLoading: true, error: null });

      // Try to load from cache first
      const cachedMessages = await dbOperations.getMessages(channelId, 100);
      if (cachedMessages.length > 0) {
        set({
          messages: {
            ...state.messages,
            [channelId]: cachedMessages
          }
        });
      }

      // Then fetch fresh data
      const messages = await odooAPI.getMessages(channelId, 100);
      
      // Save to cache
      await dbOperations.saveMessages(messages);
      
      set({
        messages: {
          ...state.messages,
          [channelId]: messages
        },
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load messages',
        isLoading: false 
      });
    }
  },

  sendMessage: async (channelId: number, content: string) => {
    try {
      const state = get();
      const newMessage = await odooAPI.sendMessage(channelId, content);
      
      const currentMessages = state.messages[channelId] || [];
      const updatedMessages = [newMessage, ...currentMessages];
      
      set({
        messages: {
          ...state.messages,
          [channelId]: updatedMessages
        }
      });

      // Save to cache
      await dbOperations.saveMessages([newMessage]);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message' });
    }
  },

  toggleStarMessage: async (messageId: number) => {
    // Mock implementation - would integrate with Odoo API
    const state = get();
    const updatedMessages = { ...state.messages };
    
    Object.keys(updatedMessages).forEach(channelId => {
      updatedMessages[parseInt(channelId)] = updatedMessages[parseInt(channelId)].map(msg => 
        msg.id === messageId ? { ...msg, isStarred: !msg.isStarred } : msg
      );
    });
    
    set({ messages: updatedMessages });
  },

  setOfflineStatus: (isOffline: boolean) => {
    set({ isOffline });
  },

  getUnreadCount: (): number => {
    const state = get();
    return Object.values(state.channels).reduce((total, channel) => 
      total + channel.unreadCount, 0
    );
  },

  getStarredMessages: (): Message[] => {
    const state = get();
    const allMessages: Message[] = [];
    
    Object.values(state.messages).forEach(channelMessages => {
      allMessages.push(...channelMessages.filter(msg => msg.isStarred));
    });
    
    return allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  loadRecentMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const recentMessages = await odooAPI.getRecentMessages(50);
      
      // Group messages by channel
      const messagesByChannel: Record<number, Message[]> = {};
      recentMessages.forEach(message => {
        if (!messagesByChannel[message.channelId]) {
          messagesByChannel[message.channelId] = [];
        }
        messagesByChannel[message.channelId].push(message);
      });

      // Save to cache
      await dbOperations.saveMessages(recentMessages);
      
      set({ 
        messages: messagesByChannel,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load recent messages',
        isLoading: false 
      });
    }
  },

  initializeRealTime: async (serverUrl: string, token: string) => {
    try {
      // Connect to WebSocket
      webSocketService.connect(serverUrl, token);

      // Set up event listeners for real-time updates
      const handleNewMessage = (event: CustomEvent) => {
        const { message, author, channel } = event.detail;
        const state = get();
        
        const currentMessages = state.messages[message.channelId] || [];
        const updatedMessages = [message, ...currentMessages];
        
        set({
          messages: {
            ...state.messages,
            [message.channelId]: updatedMessages
          }
        });

        // Update channel unread count if not currently viewing
        if (state.currentChannelId !== message.channelId) {
          const channel = state.channels[message.channelId];
          if (channel) {
            set({
              channels: {
                ...state.channels,
                [message.channelId]: {
                  ...channel,
                  unreadCount: channel.unreadCount + 1
                }
              }
            });
          }
        }
      };

      const handleUserStatusChange = (event: CustomEvent) => {
        const { userId, isOnline } = event.detail;
        const state = get();
        const user = state.users[userId];
        
        if (user) {
          set({
            users: {
              ...state.users,
              [userId]: {
                ...user,
                isOnline
              }
            }
          });
        }
      };

      window.addEventListener('newMessage', handleNewMessage as EventListener);
      window.addEventListener('userStatusChanged', handleUserStatusChange as EventListener);

      const handleWebSocketStatus = (event: CustomEvent) => {
        const { isConnected } = event.detail;
        get().setRealTimeConnected(isConnected);
      };

      window.addEventListener('websocketConnectionStatus', handleWebSocketStatus as EventListener);

      // Clean up listeners when store is destroyed
      return () => {
        window.removeEventListener('newMessage', handleNewMessage as EventListener);
        window.removeEventListener('userStatusChanged', handleUserStatusChange as EventListener);
        window.removeEventListener('websocketConnectionStatus', handleWebSocketStatus as EventListener);
        webSocketService.disconnect();
      };
    } catch (error) {
      console.error('Failed to initialize real-time features:', error);
    }
  },

  requestNotificationPermission: async () => {
    return await notificationService.requestPermission();
  }
}));