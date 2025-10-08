import Dexie, { Table } from "dexie";
import { Message, User, Channel } from "../types";

export class OdooDiscussDB extends Dexie {
  users!: Table<User>;
  channels!: Table<Channel>;
  messages!: Table<Message>;

  constructor() {
    super("OdooDiscussDB");

    this.version(1).stores({
      users: "++id, name, email, isOnline",
      channels: "++id, name, type, unreadCount",
      messages: "++id, channelId, authorId, createdAt, isStarred",
    });
  }
}

export const db = new OdooDiscussDB();

export const dbOperations = {
  // Messages
  async getMessages(channelId: number, limit = 100): Promise<Message[]> {
    return await db.messages
      .where("channelId")
      .equals(channelId)
      .reverse()
      .limit(limit)
      .sortBy("createdAt");
    // .toArray();
  },

  async getRecentMessages(limit = 20): Promise<Message[]> {
    return await db.messages
      .orderBy("createdAt")
      .reverse()
      .limit(limit)
      .toArray();
  },

  async saveMessages(messages: Message[]): Promise<void> {
    await db.messages.bulkPut(messages);
  },

  async getStarredMessages(): Promise<Message[]> {
    return await db.messages.where("isStarred").equals(true).toArray();
  },

  // Users
  async saveUsers(users: User[]): Promise<void> {
    await db.users.bulkPut(users);
  },

  async getUser(id: number): Promise<User | undefined> {
    return await db.users.get(id);
  },

  async getAllUsers(): Promise<User[]> {
    return await db.users.toArray();
  },

  // Channels
  async saveChannels(channels: Channel[]): Promise<void> {
    await db.channels.bulkPut(channels);
  },

  async getChannels(type?: "channel" | "direct" | "group"): Promise<Channel[]> {
    if (type) {
      return await db.channels.where("type").equals(type).toArray();
    }
    return await db.channels.toArray();
  },

  async updateChannelUnreadCount(
    channelId: number,
    count: number,
  ): Promise<void> {
    await db.channels.update(channelId, { unreadCount: count });
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await Promise.all([
      db.users.clear(),
      db.channels.clear(),
      db.messages.clear(),
    ]);
  },
};

