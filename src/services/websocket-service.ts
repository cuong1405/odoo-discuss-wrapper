import { io, Socket } from 'socket.io-client';
import { Message, User, Channel } from '../types';
import { notificationService } from './notification-service';

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(serverUrl: string, token: string) {
    if (this.socket?.connected) {
      return;
    }

    // For development, use the proxy URL
    const wsUrl = import.meta.env.DEV ? 'ws://localhost:5173' : serverUrl;

    this.socket = io(wsUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    // Listen for new messages
    this.socket.on('new_message', (data: { message: Message; author: User; channel?: Channel }) => {
      this.handleNewMessage(data.message, data.author, data.channel);
    });

    // Listen for message updates
    this.socket.on('message_updated', (data: { message: Message }) => {
      this.handleMessageUpdate(data.message);
    });

    // Listen for user status changes
    this.socket.on('user_status_changed', (data: { userId: number; isOnline: boolean }) => {
      this.handleUserStatusChange(data.userId, data.isOnline);
    });

    // Listen for channel updates
    this.socket.on('channel_updated', (data: { channel: Channel }) => {
      this.handleChannelUpdate(data.channel);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.socket?.connect();
    }, delay);
  }

  private handleNewMessage(message: Message, author: User, channel?: Channel) {
    // Trigger notification
    notificationService.showMessageNotification(message, author, channel?.name);

    // Emit custom event for the app to handle
    window.dispatchEvent(new CustomEvent('newMessage', {
      detail: { message, author, channel }
    }));
  }

  private handleMessageUpdate(message: Message) {
    window.dispatchEvent(new CustomEvent('messageUpdated', {
      detail: { message }
    }));
  }

  private handleUserStatusChange(userId: number, isOnline: boolean) {
    window.dispatchEvent(new CustomEvent('userStatusChanged', {
      detail: { userId, isOnline }
    }));
  }

  private handleChannelUpdate(channel: Channel) {
    window.dispatchEvent(new CustomEvent('channelUpdated', {
      detail: { channel }
    }));
  }

  // Send message through WebSocket for real-time delivery
  sendMessage(channelId: number, content: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', {
        channelId,
        content,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Join a channel room for real-time updates
  joinChannel(channelId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join_channel', { channelId });
    }
  }

  // Leave a channel room
  leaveChannel(channelId: number) {
    if (this.socket?.connected) {
      this.socket.emit('leave_channel', { channelId });
    }
  }

  // Update user status
  updateStatus(isOnline: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('update_status', { isOnline });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const webSocketService = WebSocketService.getInstance();