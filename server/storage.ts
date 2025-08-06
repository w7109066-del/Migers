import {
  users,
  friendships,
  chatRooms,
  roomMembers,
  messages,
  userSessions,
  posts,
  postLikes,
  postComments,
  type User,
  type InsertUser,
  type Friendship,
  type InsertFriendship,
  type ChatRoom,
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type UserSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  updateUserStatus(userId: string, status: string): Promise<void>;

  // Friends management
  getFriends(userId: string): Promise<(User & { friendshipStatus: string })[]>;
  refreshFriendsList(userId: string): Promise<(User & { friendshipStatus: string })[]>;
  addFriend(userId: string, friendId: string): Promise<Friendship>;
  getFriendshipStatus(userId: string, friendId: string): Promise<Friendship | undefined>;
  createFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(userId: string, friendId: string): Promise<void>;

  // Chat rooms
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(roomId: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;

  // Messages
  getRoomMessages(roomId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  getDirectMessages(userId: string, otherUserId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage);

  // Direct message conversations
  getDirectMessageConversations(userId: string): Promise<any[]>;

  // User sessions for WebSocket
  createUserSession(userId: string, socketId: string): Promise<UserSession>;
  updateUserSession(sessionId: string, socketId: string): Promise<void>;
  removeUserSession(socketId: string): Promise<void>;
  getUserBySocketId(socketId: string): Promise<User | undefined>;

  // Feed posts methods
  getFeedPosts(): Promise<
    (Omit<typeof posts.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  >;
  createFeedPost(postData: { content?: string; authorId: string; mediaType?: string; mediaUrl?: string }): Promise<typeof posts.$inferSelect>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  addComment(postId: string, commentData: { content: string; authorId: string }): Promise<typeof postComments.$inferSelect>;
  getComments(postId: string): Promise<
    (Omit<typeof postComments.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  >;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  private db = db; // Alias db for easier access in methods

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({
        isOnline,
        lastSeen: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await this.db
      .update(users)
      .set({ 
        status,
        lastSeen: new Date()
      })
      .where(eq(users.id, userId));
  }

  async refreshFriendsList(userId: string): Promise<(User & { friendshipStatus: string })[]> {
    // Update current user's last activity
    await this.updateUserOnlineStatus(userId, true);

    // Get fresh friends data with updated online status
    return this.getFriends(userId);
  }

  async getFriends(userId: string): Promise<(User & { friendshipStatus: string })[]> {
    const friends = await this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        level: users.level,
        isOnline: users.isOnline,
        country: users.country,
        status: users.status,
        createdAt: users.createdAt,
        friendshipStatus: friendships.status,
        friendshipCreatedAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(users, 
        or(
          and(eq(friendships.userId, userId), eq(users.id, friendships.friendId)),
          and(eq(friendships.friendId, userId), eq(users.id, friendships.userId))
        )
      )
      .where(eq(friendships.status, 'accepted'));

    return friends;
  }

  async addFriend(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await this.db
      .insert(friendships)
      .values({ userId, friendId, status: "pending" })
      .returning();
    return friendship;
  }

  async getFriendshipStatus(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await this.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return friendship || undefined;
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<void> {
    await this.db
      .update(friendships)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId),
          eq(friendships.status, "pending")
        )
      );
  }

  async createFriendRequest(userId: string, friendId: string): Promise<void> {
    await this.db
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: "pending"
      });
  }

  async rejectFriendRequest(userId: string, friendId: string): Promise<void> {
    await this.db
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId),
          eq(friendships.status, "pending")
        )
      );
  }

  async createFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await this.db
      .insert(friendships)
      .values({ userId, friendId, status: "pending" })
      .returning();
    return friendship;
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<void> {
    await this.db
      .update(friendships)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
  }

  async getChatRooms(): Promise<ChatRoom[]> {
    return await this.db.select().from(chatRooms).where(eq(chatRooms.isPublic, true));
  }

  async getChatRoom(roomId: string): Promise<ChatRoom | undefined> {
    const [room] = await this.db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    return room || undefined;
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [chatRoom] = await this.db
      .insert(chatRooms)
      .values(room)
      .returning();
    return chatRoom;
  }

  async joinRoom(roomId: string, userId: string): Promise<void> {
    await this.db
      .insert(roomMembers)
      .values({ roomId, userId })
      .onConflictDoNothing();
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.db
      .delete(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );
  }

  async getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]> {
    const result = await this.db
      .select({
        id: roomMembers.id,
        roomId: roomMembers.roomId,
        userId: roomMembers.userId,
        role: roomMembers.role,
        joinedAt: roomMembers.joinedAt,
        user: users,
      })
      .from(roomMembers)
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId));

    return result;
  }

  async getRoomMessages(roomId: string, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        roomId: messages.roomId,
        recipientId: messages.recipientId,
        messageType: messages.messageType,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.reverse();
  }

  async getDirectMessages(userId: string, otherUserId: string, limit = 50) {
    const messageList = await db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          level: users.level,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          isNull(messages.roomId), // Direct messages only
          or(
            and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
          )
        )
      )
      .orderBy(asc(messages.createdAt))
      .limit(limit);

    return messageList;
  }

  async getDirectMessageConversations(userId: string) {
    try {
      // Get all unique conversations for the user
      const conversations = await db
        .select({
          otherUserId: sql<string>`CASE 
            WHEN ${messages.senderId} = ${userId} THEN ${messages.recipientId}
            ELSE ${messages.senderId}
          END`,
          otherUsername: sql<string>`CASE 
            WHEN ${messages.senderId} = ${userId} THEN sender.username
            ELSE recipient.username
          END`,
          otherUserLevel: sql<number>`CASE 
            WHEN ${messages.senderId} = ${userId} THEN sender.level
            ELSE recipient.level
          END`,
          otherUserIsOnline: sql<boolean>`CASE 
            WHEN ${messages.senderId} = ${userId} THEN sender.is_online
            ELSE recipient.is_online
          END`,
          lastMessage: messages.content,
          lastMessageType: messages.messageType,
          lastMessageTime: messages.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id), { alias: 'sender' })
        .innerJoin(users, eq(messages.recipientId, users.id), { alias: 'recipient' })
        .where(
          and(
            isNull(messages.roomId), // Direct messages only
            or(
              eq(messages.senderId, userId),
              eq(messages.recipientId, userId)
            )
          )
        )
        .orderBy(desc(messages.createdAt));

      // Group by other user and get the latest message for each conversation
      const conversationMap = new Map();

      for (const conv of conversations) {
        if (!conversationMap.has(conv.otherUserId)) {
          conversationMap.set(conv.otherUserId, {
            id: conv.otherUserId,
            username: conv.otherUsername,
            level: conv.otherUserLevel,
            isOnline: conv.otherUserIsOnline,
            lastMessage: conv.lastMessage,
            lastMessageType: conv.lastMessageType,
            lastMessageTime: conv.lastMessageTime,
          });
        }
      }

      return Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
    } catch (error) {
      console.error('Error getting DM conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }
}

export const storage = new DatabaseStorage();