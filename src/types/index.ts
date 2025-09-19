export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: number;
  content: string;
  authorId: number;
  channelId: number;
  createdAt: Date;
  isStarred: boolean;
  parentId?: number;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Channel {
  id: number;
  name: string;
  description?: string;
  type: 'channel' | 'direct' | 'group';
  memberIds: number[];
  unreadCount: number;
  lastMessage?: Message;
  isArchived: boolean;
}

export interface Attachment {
  id: number;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  userIds: number[];
}

export interface AuthCredentials {
  serverUrl: string;
  database: string;
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  serverUrl: string | null;
  database: string | null;
}

export interface AppState {
  users: Record<number, User>;
  channels: Record<number, Channel>;
  messages: Record<number, Message[]>;
  recentMessages: Message[];
  currentChannelId: number | null;
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
}

export type NavigationTab = 'inbox' | 'recent' | 'starred' | 'history' | 'channels' | 'direct';
