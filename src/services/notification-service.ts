import { Message, User } from '../types';

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  async showMessageNotification(message: Message, author: User, channelName?: string) {
    if (this.permission !== 'granted') {
      return;
    }

    // Don't show notification if the page is visible and focused
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    const title = channelName ? `${author.name} in ${channelName}` : author.name;
    const body = message.content.length > 100 
      ? message.content.substring(0, 100) + '...' 
      : message.content;

    const notification = new Notification(title, {
      body,
      icon: author.avatar || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `message-${message.id}`,
      requireInteraction: false,
      silent: false
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click to focus the app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  async showSystemNotification(title: string, message: string) {
    if (this.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body: message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'system-notification'
    });

    setTimeout(() => {
      notification.close();
    }, 3000);
  }
}

export const notificationService = NotificationService.getInstance();