import { create } from 'zustand';
import { AppState, User, Channel, Message, NavigationTab } from '../types';
import { odooAPI } from '../services/odoo-api';
import { dbOperations } from '../db';

interface AppStore extends AppState {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  setCurrentChannel: (channelId: number | null) => void;
  loadUsers: () => Promise<void>;
  loadChannels: () => Promise<void>;
  loadMessages: (channelId: number) => Promise<void>;
  loadRecentMessages: () => Promise<void>;
  sendMessage: (channelId: number, content: string) => Promise<void>;
  toggleStarMessage: (messageId: number) => Promise<void>;
  setOfflineStatus: (isOffline: boolean) => void;
  getUnreadCount: () => number;
  getStarredMessages: () => Message[];
  recentMessages: Message[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  users: {},
  channels: {},
  messages: {},
  recentMessages: [],
  currentChannelId: null,
  currentTab: 'inbox',
  isLoading: false,
  error: null,
  isOffline: false,

  setCurrentTab: (tab: NavigationTab) => {
    set({ currentTab: tab });
  },

  setCurrentChannel: (channelId: number | null) => {
    set({ currentChannelId: channelId });
    if (channelId) {
      get().loadMessages(channelId);
    }
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

  loadRecentMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Try to load from cache first
      const cachedMessages = await dbOperations.getRecentMessages(20);
      if (cachedMessages.length > 0) {
        set({ recentMessages: cachedMessages });
      }

      // Then fetch fresh data from Odoo API
      const recentMessages = await odooAPI.getRecentMessages(20, 0);
      
      // Save to cache
      await dbOperations.saveMessages(recentMessages);
      
      set({ recentMessages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load recent messages',
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
  }
}));
