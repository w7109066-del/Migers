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

  async getDirectMessages(userId: string, otherUserId: string, limit: number = 50): Promise<(Message & { sender: User })[]> {
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
      .where(
        and(
          eq(messages.roomId, null),
          or(
            and(eq(messages.senderId, userId), eq(messages.recipientId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.recipientId, userId))
          )
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.reverse();
  }

  async createMessage(data: InsertMessage) {
    const [message] = await this.db.insert(messages).values(data).returning();
    return message;
  }

  async createDirectMessage(data: { content: string; senderId: string; recipientId: string; messageType?: string }) {
    const [message] = await this.db
      .insert(messages)
      .values({
        content: data.content,
        senderId: data.senderId,
        recipientId: data.recipientId,
        messageType: data.messageType || 'text',
        roomId: null
      })
      .returning();

    // Get the full message with sender info
    const fullMessage = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        messageType: messages.messageType,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, message.id));

    return fullMessage[0];
  }

  async createUserSession(userId: string, socketId: string): Promise<UserSession> {
    const [session] = await this.db
      .insert(userSessions)
      .values({ userId, socketId })
      .returning();
    return session;
  }

  async updateUserSession(sessionId: string, socketId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ socketId, updatedAt: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  async removeUserSession(socketId: string): Promise<void> {
    return this.db.delete(userSessions)
      .where(eq(userSessions.socketId, socketId));
  }

  // Feed posts methods
  async getFeedPosts() {
    return this.db
      .select({
        id: posts.id,
        content: posts.content,
        mediaType: posts.mediaType,
        mediaUrl: posts.mediaUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        author: {
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(50);
  }

  async createFeedPost(postData: { content?: string; authorId: string; mediaType?: string; mediaUrl?: string }) {
    const [post] = await this.db
      .insert(posts)
      .values({
        content: postData.content || null,
        authorId: postData.authorId,
        mediaType: postData.mediaType || 'text',
        mediaUrl: postData.mediaUrl || null
      })
      .returning();
    return post;
  }

  async likePost(postId: string, userId: string) {
    // Check if already liked
    const existingLike = await this.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existingLike.length > 0) {
      return; // Already liked
    }

    await this.db.transaction(async (tx) => {
      // Add like
      await tx.insert(postLikes).values({ postId, userId });

      // Increment likes count
      await tx
        .update(posts)
        .set({
          likesCount: sql`${posts.likesCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId));
    });
  }

  async unlikePost(postId: string, userId: string) {
    await this.db.transaction(async (tx) => {
      // Remove like
      await tx
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

      // Decrement likes count
      await tx
        .update(posts)
        .set({
          likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId));
    });
  }

  async addComment(postId: string, commentData: { content: string; authorId: string }) {
    return this.db.transaction(async (tx) => {
      // Add comment
      const [comment] = await tx
        .insert(postComments)
        .values({ ...commentData, postId })
        .returning();

      // Increment comments count
      await tx
        .update(posts)
        .set({
          commentsCount: sql`${posts.commentsCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId));

      return comment;
    });
  }

  async getComments(postId: string) {
    return this.db
      .select({
        id: postComments.id,
        content: postComments.content,
        createdAt: postComments.createdAt,
        author: {
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
        },
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.authorId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(postComments.createdAt);
  }

  async getUserBySocketId(socketId: string): Promise<User | undefined> {
    const result = await this.db
      .select({ user: users })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(eq(userSessions.socketId, socketId));

    return result[0]?.user;
  }

  async getDirectMessageConversations(userId: string) {
    try {
      // Get all users that have had direct message conversations with the current user
      // with their latest message
      const subquery = this.db
        .select({
          otherUserId: sql`CASE 
            WHEN ${messages.senderId} = ${userId} THEN ${messages.recipientId}
            ELSE ${messages.senderId}
          END`.as('otherUserId'),
          lastMessageId: sql`MAX(${messages.id})`.as('lastMessageId')
        })
        .from(messages)
        .where(
          and(
            isNotNull(messages.recipientId),
            or(
              eq(messages.senderId, userId),
              eq(messages.recipientId, userId)
            )
          )
        )
        .groupBy(sql`CASE 
          WHEN ${messages.senderId} = ${userId} THEN ${messages.recipientId}
          ELSE ${messages.senderId}
        END`)
        .as('latest_messages');

      const conversations = await this.db
        .select({
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
          status: users.status,
          lastMessage: messages.content,
          lastMessageTime: messages.createdAt,
          unreadCount: sql`0`.as('unreadCount') // Placeholder for unread count
        })
        .from(subquery)
        .innerJoin(users, eq(users.id, subquery.otherUserId))
        .leftJoin(messages, eq(messages.id, subquery.lastMessageId))
        .orderBy(desc(messages.createdAt));

      return conversations;
    } catch (error) {
      console.error('Error fetching DM conversations:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();