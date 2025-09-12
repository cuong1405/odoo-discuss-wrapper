import { create } from 'zustand';
import { AuthState, User, AuthCredentials } from '../types';
import { odooAPI } from '../services/odoo-api';

interface AuthStore extends AuthState {
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  serverUrl: null,
  database: null,

  login: async (credentials: AuthCredentials) => {
    try {
      const { token, user } = await odooAPI.authenticate(credentials);
      
      set({
        isAuthenticated: true,
        user,
        token,
        serverUrl: credentials.serverUrl,
        database: credentials.database
      });
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    odooAPI.logout();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      serverUrl: null,
      database: null
    });
  },

  restoreSession: async () => {
    try {
      const session = await odooAPI.restoreSession();
      if (session) {
        set({
          isAuthenticated: true,
          user: session.user,
          token: session.token,
          serverUrl: null, // Will be set by API
          database: null   // Will be set by API
        });
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  },

  setUser: (user: User) => {
    set({ user });
  }
}));