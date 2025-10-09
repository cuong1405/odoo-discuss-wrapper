import axios, { AxiosInstance, AxiosError } from "axios";
import { AuthCredentials, User, Channel, Message } from "../types";
import { secureStorage } from "../utils/crypto";

class OdooAPI {
  private client: AxiosInstance | null = null;
  private serverUrl: string = "";
  private originalServerUrl: string = "";
  private database: string | null = null;

  async authenticate(
    credentials: AuthCredentials,
  ): Promise<{ token: string; user: User }> {
    console.log("Value of import.meta.env.DEV:", import.meta.env.DEV);
    try {
      this.originalServerUrl = credentials.serverUrl.replace(/\/$/, "");
      // Use proxy in development, direct URL in production
      this.serverUrl = import.meta.env.DEV ? "/api" : this.originalServerUrl;
      this.database = credentials.database;

      // Create temporary client for authentication
      const authClient = axios.create({
        baseURL: "/api",
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Target-URL": this.originalServerUrl,
          "X-Odoo-Database": this.database,
        },
        withCredentials: true,
      });

      // // Add request interceptor to handle CORS in production
      // authClient.interceptors.request.use((config) => {
      //   // In production, we might need to handle CORS differently
      //   if (!import.meta.env.DEV) {
      //     config.headers["Access-Control-Allow-Origin"] = "*";
      //     config.headers["Access-Control-Allow-Methods"] =
      //       "GET, POST, PUT, DELETE, OPTIONS";
      //     config.headers["Access-Control-Allow-Headers"] =
      //       "Content-Type, Authorization, Cookie";
      //   }
      //   return config;
      // });
      // Authenticate with Odoo
      const response = await authClient.post("/web/session/authenticate", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          db: credentials.database,
          login: credentials.username,
          password: credentials.password,
          context: {},
        },
      });

      if (response.data.error) {
        throw new Error(
          response.data.error.data.message || "Authentication failed",
        );
      }

      const sessionInfo = response.data.result;
      console.log("sessionInfo:", sessionInfo);
      if (!sessionInfo || !sessionInfo.uid) {
        throw new Error("Invalid credentials");
      }

      // Store authentication data
      const token = sessionInfo.session_id || "authenticated";
      console.log("Value of token:", token);
      secureStorage.setItem("auth_token", token);
      console.log("Cookies after login:", document.cookie);
      secureStorage.setItem("server_url", this.originalServerUrl);
      secureStorage.setItem("database", this.database);

      // Initialize authenticated client
      this.initializeClient(token);

      const userId = sessionInfo.uid;
      const user = await this.getCurrentUser(userId);
      secureStorage.setItem("user_id", String(userId));

      return {
        token,
        user,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle CORS errors
        if (
          axiosError.message.includes("CORS") ||
          axiosError.message.includes("Access-Control-Allow-Origin")
        ) {
          throw new Error(
            "CORS error: The server does not allow requests from this domain. Please contact your system administrator to configure CORS settings.",
          );
        }

        if (
          axiosError.code === "ECONNREFUSED" ||
          axiosError.code === "ENOTFOUND"
        ) {
          throw new Error("Server unreachable. Please check the URL.");
        }
        if (axiosError.response?.status === 404) {
          throw new Error(
            "Database not found. Please check the database name.",
          );
        }
        if (axiosError.response?.status === 0) {
          throw new Error(
            "Network error: Unable to connect to the server. This might be a CORS issue.",
          );
        }
      }
      throw error;
    }
  }

  private initializeClient(token: string) {
    const isProduction = !import.meta.env.DEV;

    this.client = axios.create({
      baseURL: "/api",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Odoo-database": this.database,
        ...(isProduction && { "X-Target-URL": this.originalServerUrl }),
      },
      withCredentials: true,
    });

    // // Add request interceptor for CORS handling
    // this.client.interceptors.request.use((config) => {
    //   // In production, we might need to handle CORS differently
    //   if (!import.meta.env.DEV) {
    //     config.headers["Access-Control-Allow-Origin"] = "*";
    //     config.headers["Access-Control-Allow-Methods"] =
    //       "GET, POST, PUT, DELETE, OPTIONS";
    //     config.headers["Access-Control-Allow-Headers"] =
    //       "Content-Type, Authorization, Cookie";
    //   }
    //   return config;
    // });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage and redirect to login
          secureStorage.removeItem("auth_token");
          secureStorage.removeItem("server_url");
          secureStorage.removeItem("database");
          window.location.reload();
        }
        console.error(
          "Response error:",
          error.response ? error.response.config.url : "",
          error,
        );
        return Promise.reject(error);
      },
    );
  }

  async restoreSession(): Promise<{ token: string; user: User } | null> {
    const token = secureStorage.getItem("auth_token");
    const originalServerUrl = secureStorage.getItem("server_url");
    const database = secureStorage.getItem("database");
    const userIdStr = secureStorage.getItem("user_id");
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    if (!token || !originalServerUrl || !database || !userId) {
      return null;
    }

    this.originalServerUrl = originalServerUrl;
    this.serverUrl = import.meta.env.DEV ? "/api" : this.originalServerUrl;
    this.database = database;
    // this.initializeClient(token);

    try {
      const user = await this.getCurrentUser(userId);

      return {
        token,
        user,
      };
    } catch {
      // Session expired
      secureStorage.removeItem("auth_token");
      secureStorage.removeItem("server_url");
      secureStorage.removeItem("database");
      return null;
    }
  }

  private async getCurrentUser(userId: number): Promise<User> {
    if (!this.client) {
      const token = secureStorage.getItem("auth_token");
      if (token) {
        this.initializeClient(token);
      } else {
        throw new Error("Authentication token not found.");
      }
    }

    if (!this.client) throw new Error("Not authenticated");

    try {
      const response = await this.client.post("/web/dataset/call_kw", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "res.users",
          method: "read",
          args: [[userId]],
          kwargs: {
            fields: ["id", "name", "email", "avatar_128", "partner_id"],
          },
        },
      });

      if (response.data.result && response.data.result.length > 0) {
        const userData = response.data.result[0];
        if (userData.partner_id && userData.partner_id.length > 0) {
          secureStorage.setItem("partner_id", String(userData.partner_id[0]));
        }
        return {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar_128
            ? `data:image/png;base64,${userData.avatar_128}`
            : undefined,
        };
      } else {
        throw new Error("No user data returned");
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      // Return a fallback user object
      return {
        id: userId,
        name: "User",
        email: "user@example.com",
      };
    }
  }

  async getUsers(): Promise<User[]> {
    if (!this.client) throw new Error("Not authenticated");

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "res.partner",
        method: "search_read",
        args: [[]],
        kwargs: {
          fields: ["id", "name", "email", "avatar_128"],
          limit: 1000,
        },
      },
    });

    return response.data.result.map((partner: any) => ({
      id: partner.id,
      name: partner.name,
      email: partner.email || "",
      avatar: partner.avatar_128
        ? `data:image/png;base64,${partner.avatar_128}`
        : undefined,
    }));
  }

  async getChannels(): Promise<Channel[]> {
    if (!this.client) throw new Error("Not authenticated");

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "discuss.channel",
        method: "search_read",
        args: [
          [
            ["is_member", "=", true],
            ["channel_type", "=", "channel"],
          ],
        ],
        kwargs: {
          fields: [
            "active",
            "id",
            "name",
            "description",
            "channel_type",
            "channel_member_ids",
            "channel_partner_ids",
            "avatar_128",
            "is_member",
            "member_count",
            "message_ids",
          ],
          limit: 100,
        },
      },
    });

    return response.data.result.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.channel_type,
      memberIds: channel.channel_member_ids,
      partnerIds: channel.channel_partner_ids,
      avatar: channel.avatar_128
        ? `data:image/png;base64,${channel.avatar_128}`
        : `${this.originalServerUrl}/web/image/discuss.channel/${channel.id}/avatar_128`,
      isMember: channel.is_member,
      memberCount: channel.member_count,
      isArchived: !channel.active,
      messageIds: channel.message_ids || [],
    }));
  }

  async getDirectChannels(): Promise<Channel[]> {
    if (!this.client) throw new Error("Not authenticated");
    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "discuss.channel",
        method: "search_read",
        args: [
          [
            ["channel_type", "in", ["chat", "group"]],
            ["is_member", "=", true],
          ],
        ],
        kwargs: {
          fields: [
            "active",
            "id",
            "name",
            "description",
            "channel_type",
            "channel_member_ids",
            "channel_partner_ids",
            "avatar_128",
            "is_member",
            "member_count",
            "message_ids",
          ],
          limit: 100,
        },
      },
    });

    const currentUserId = parseInt(
      secureStorage.getItem("partner_id") || "0",
      10,
    );

    return response.data.result.map((channel: any) => {
      let otherUserId: number | undefined;
      if (channel.channel_type === "chat") {
        const partnerId = channel.channel_partner_ids.find(
          (id: number) => id !== currentUserId,
        );
        console.log(
          "Current:",
          currentUserId,
          "Partners:",
          channel.channel_partner_ids,
          "Other:",
          partnerId,
        );
        otherUserId = partnerId;
      }
      return {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.channel_type,
        otherUserId: otherUserId,
        memberIds: channel.channel_member_ids,
        partnerIds: channel.channel_partner_ids,
        avatar: channel.avatar_128
          ? `data:image/png;base64,${channel.avatar_128}`
          : `${this.originalServerUrl}/web/image/discuss.channel/${channel.id}/avatar_128`,
        isMember: channel.is_member,
        memberCount: channel.member_count,
        isArchived: !channel.active,
        messageIds: channel.message_ids || [],
      };
    });
  }

  async getMessages(channelId: number, limit = 100): Promise<Message[]> {
    if (!this.client) throw new Error("Not authenticated");

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "mail.message",
        method: "search_read",
        args: [
          [
            ["res_id", "=", channelId],
            ["model", "=", "discuss.channel"],
          ],
        ],
        kwargs: {
          fields: ["id", "body", "author_id", "date", "starred_partner_ids"],
          limit,
          order: "date desc",
        },
      },
    });

    return response.data.result.map((msg: any) => ({
      id: msg.id,
      content: msg.body || "",
      authorId: msg.author_id[0],
      channelId,
      createdAt: new Date(msg.date),
      isStarred: msg.starred_partner_ids.length > 0,
    }));
  }

  async getMessagesByIds(messageIds: number[]): Promise<Message[]> {
    if (!this.client) throw new Error("Not authenticated");
    if (!messageIds.length) return [];

    try {
      const response = await this.client.post("/web/dataset/call_kw", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "mail.message",
          method: "read",
          args: [messageIds],
          kwargs: {
            fields: [
              "id",
              "body",
              "author_id",
              "date",
              "starred_partner_ids",
              "res_id",
              "model",
            ],
          },
        },
      });

      if (response.data.error) {
        throw new Error(
          response.data.error.data.message || "Failed to fetch messages",
        );
      }

      return response.data.result.map((msg: any) => ({
        id: msg.id,
        content: this.stripHtmlTags(msg.body || ""),
        authorId: msg.author_id ? msg.author_id[0] : 0,
        channelId: msg.res_id || 0,
        createdAt: new Date(msg.date),
        isStarred:
          msg.starred_partner_ids && msg.starred_partner_ids.length > 0,
      }));
    } catch (error) {
      console.error("Error fetching messages by IDs:", error);
      throw error;
    }
  }

  async sendMessage(channelId: number, content: string): Promise<Message> {
    if (!this.client) throw new Error("Not authenticated");

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "discuss.channel",
        method: "message_post",
        args: [channelId],
        kwargs: {
          body: content,
          message_type: "comment",
        },
      },
    });

    // Return a mock message for now
    return {
      id: response.data.result,
      content,
      authorId: 1, // Current user
      channelId,
      createdAt: new Date(),
      isStarred: false,
    };
  }

  async getRecentMessages(limit = 20, offset = 0): Promise<Message[]> {
    if (!this.client) throw new Error("Not authenticated");

    try {
      const response = await this.client.post("/web/dataset/call_kw", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "mail.message",
          method: "search_read",
          args: [[["model", "=", "discuss.channel"]]],
          kwargs: {
            fields: [
              "id",
              "body",
              "author_id",
              "date",
              "starred_partner_ids",
              "res_id",
              "model",
            ],
            limit,
            offset,
            order: "date desc",
          },
        },
      });

      if (response.data.error) {
        throw new Error(
          response.data.error.data.message || "Failed to fetch recent messages",
        );
      }

      return response.data.result.map((msg: any) => ({
        id: msg.id,
        content: this.stripHtmlTags(msg.body || ""),
        authorId: msg.author_id ? msg.author_id[0] : 0,
        channelId: msg.res_id || 0,
        createdAt: new Date(msg.date),
        isStarred:
          msg.starred_partner_ids && msg.starred_partner_ids.length > 0,
      }));
    } catch (error) {
      console.error("Error fetching recent messages:", error);
      throw error;
    }
  }

  async getUsersByIds(ids: number[]): Promise<User[]> {
    if (!this.client) throw new Error("Not authenticated");
    if (!ids.length) return [];

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "res.partner",
        method: "read",
        args: [ids],
        kwargs: { fields: ["id", "name", "email", "avatar_128"] },
      },
    });

    console.log("getUsersByIds ids:", ids);
    console.log("getUsersByIds response.data.result:", response.data?.result);

    return response.data.result.map((partner: any) => ({
      id: partner.id,
      name: partner.name,
      email: partner.email || "",
      avatar: partner.avatar_128
        ? `data:image/png;base64,${partner.avatar_128}`
        : undefined,
    }));
  }

  async getChannelsByIds(ids: number[]): Promise<Channel[]> {
    if (!this.client) throw new Error("Not authenticated");
    if (!ids.length) return [];

    const response = await this.client.post("/web/dataset/call_kw", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "discuss.channel",
        method: "read",
        args: [ids],
        kwargs: {
          fields: [
            "active",
            "id",
            "name",
            "description",
            "channel_type",
            "channel_member_ids",
            "channel_partner_ids",
            "avatar_128",
            "is_member",
            "member_count",
          ],
        },
      },
    });

    console.log("getChannelsByIds ids:", ids);
    console.log(
      "getChannelsByIds response.data.result:",
      response.data?.result,
    );

    return response.data.result.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.channel_type,
      memberIds: channel.channel_member_ids,
      partnerIds: channel.channel_partner_ids,
      avatar: channel.avatar_128
        ? `data:image/png;base64,${channel.avatar_128}`
        : `${this.originalServerUrl}/web/image/discuss.channel/${channel.id}/avatar_128`,
      isMember: channel.is_member,
      memberCount: channel.member_count,
      isArchived: !channel.active,
    }));
  }

  private stripHtmlTags(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  logout() {
    secureStorage.removeItem("auth_token");
    secureStorage.removeItem("server_url");
    secureStorage.removeItem("database");
    this.client = null;
    this.serverUrl = "";
    this.database = null;
  }
}

export const odooAPI = new OdooAPI();
