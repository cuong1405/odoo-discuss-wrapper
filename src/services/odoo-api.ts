import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthCredentials, User, Channel, Message } from '../types';
import { secureStorage } from '../utils/crypto';

class OdooAPI {
  private client: AxiosInstance | null = null;
  private serverUrl: string | null = null;
  private database: string | null = null;

  async authenticate(credentials: AuthCredentials): Promise<{ token: string; user: User }> {
    try {
      this.serverUrl = credentials.serverUrl.replace(/\/$/, '');
      this.database = credentials.database;

      // Create temporary client for authentication
      const authClient = axios.create({
        baseURL: this.serverUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Authenticate with Odoo
      const response = await authClient.post('/web/session/authenticate', {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: credentials.database,
          login: credentials.username,
          password: credentials.password
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.data.message || 'Authentication failed');
      }

      const sessionInfo = response.data.result;
      if (!sessionInfo || !sessionInfo.uid) {
        throw new Error('Invalid credentials');
      }

      // Store authentication data
      const token = sessionInfo.session_id;
      secureStorage.setItem('auth_token', token);
      secureStorage.setItem('server_url', this.serverUrl);
      secureStorage.setItem('database', this.database);

      // Initialize authenticated client
      this.initializeClient(token);

      // Get user information
      const userInfo = await this.getCurrentUser();

      return {
        token,
        user: {
          id: sessionInfo.uid,
          name: sessionInfo.name,
          email: sessionInfo.username,
          isOnline: true
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
          throw new Error('Server unreachable. Please check the URL.');
        }
        if (axiosError.response?.status === 404) {
          throw new Error('Database not found. Please check the database name.');
        }
      }
      throw error;
    }
  }

  private initializeClient(token: string) {
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session_id=${token}`
      }
    });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage and redirect to login
          secureStorage.removeItem('auth_token');
          secureStorage.removeItem('server_url');
          secureStorage.removeItem('database');
          window.location.reload();
        }
        return Promise.reject(error);
      }
    );
  }

  async restoreSession(): Promise<{ token: string; user: User } | null> {
    const token = secureStorage.getItem('auth_token');
    const serverUrl = secureStorage.getItem('server_url');
    const database = secureStorage.getItem('database');

    if (!token || !serverUrl || !database) {
      return null;
    }

    this.serverUrl = serverUrl;
    this.database = database;
    this.initializeClient(token);

    try {
      const user = await this.getCurrentUser();
      return { token, user };
    } catch {
      // Session expired
      secureStorage.removeItem('auth_token');
      secureStorage.removeItem('server_url');
      secureStorage.removeItem('database');
      return null;
    }
  }

  private async getCurrentUser(): Promise<User> {
    if (!this.client) throw new Error('Not authenticated');

    const response = await this.client.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'res.users',
        method: 'read',
        args: [[1]], // Current user
        kwargs: {
          fields: ['id', 'name', 'email', 'avatar_128']
        }
      }
    });

    const userData = response.data.result[0];
    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar_128 ? `data:image/png;base64,${userData.avatar_128}` : undefined,
      isOnline: true
    };
  }

  async getUsers(): Promise<User[]> {
    if (!this.client) throw new Error('Not authenticated');

    const response = await this.client.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'res.users',
        method: 'search_read',
        args: [[]],
        kwargs: {
          fields: ['id', 'name', 'email', 'avatar_128'],
          limit: 1000
        }
      }
    });

    return response.data.result.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_128 ? `data:image/png;base64,${user.avatar_128}` : undefined,
      isOnline: Math.random() > 0.3 // Mock online status
    }));
  }

  async getChannels(): Promise<Channel[]> {
    if (!this.client) throw new Error('Not authenticated');

    const response = await this.client.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'mail.channel',
        method: 'search_read',
        args: [[]],
        kwargs: {
          fields: ['id', 'name', 'description', 'channel_type', 'channel_member_ids'],
          limit: 100
        }
      }
    });

    return response.data.result.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.channel_type === 'chat' ? 'direct' : 'channel',
      memberIds: channel.channel_member_ids,
      unreadCount: Math.floor(Math.random() * 5), // Mock unread count
      isArchived: false
    }));
  }

  async getMessages(channelId: number, limit = 100): Promise<Message[]> {
    if (!this.client) throw new Error('Not authenticated');

    const response = await this.client.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'mail.message',
        method: 'search_read',
        args: [[['res_id', '=', channelId], ['model', '=', 'mail.channel']]],
        kwargs: {
          fields: ['id', 'body', 'author_id', 'date', 'starred_partner_ids'],
          limit,
          order: 'date desc'
        }
      }
    });

    return response.data.result.map((msg: any) => ({
      id: msg.id,
      content: msg.body || '',
      authorId: msg.author_id[0],
      channelId,
      createdAt: new Date(msg.date),
      isStarred: msg.starred_partner_ids.length > 0
    }));
  }

  async sendMessage(channelId: number, content: string): Promise<Message> {
    if (!this.client) throw new Error('Not authenticated');

    const response = await this.client.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'mail.channel',
        method: 'message_post',
        args: [channelId],
        kwargs: {
          body: content,
          message_type: 'comment'
        }
      }
    });

    // Return a mock message for now
    return {
      id: response.data.result,
      content,
      authorId: 1, // Current user
      channelId,
      createdAt: new Date(),
      isStarred: false
    };
  }

  logout() {
    secureStorage.removeItem('auth_token');
    secureStorage.removeItem('server_url');
    secureStorage.removeItem('database');
    this.client = null;
    this.serverUrl = null;
    this.database = null;
  }
}

export const odooAPI = new OdooAPI();
