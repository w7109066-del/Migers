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
import crypto from 'crypto';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  searchUsers(query: string, currentUserId: string): Promise<User[]>;

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
  createRoom(roomData: InsertChatRoom, createdBy: string): Promise<ChatRoom>;
  getAllRooms(): Promise<ChatRoom[]>;
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;
  kickMember(roomId: string, userId: string): Promise<void>; // Added kickMember
  closeRoom(roomId: string): Promise<void>; // Added closeRoom

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
  addComment(postId: string, commentData: { content: string; authorId: string }): Promise<typeof postComments.$inferSelect & { author: Pick<User, "id" | "username" | "level" | "isOnline"> }>;
  getComments(postId: string): Promise<
    (Omit<typeof postComments.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  >;
  getUserLikes(userId: string, postIds: string[]): Promise<string[]>;
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

  async updateUserStatusMessage(userId: string, statusMessage: string): Promise<void> {
    await this.db
      .update(users)
      .set({ 
        status: statusMessage,
        lastSeen: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, profileData: { 
    bio?: string | null; 
    country?: string | null; 
    profilePhotoUrl?: string | null;
  }): Promise<void> {
    const updateData: any = {
      lastSeen: new Date()
    };

    if (profileData.bio !== undefined) {
      updateData.bio = profileData.bio;
    }

    if (profileData.country !== undefined) {
      updateData.country = profileData.country;
    }

    if (profileData.profilePhotoUrl) {
      updateData.profilePhotoUrl = profileData.profilePhotoUrl;
    }

    await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    const searchResults = await this.db
      .select()
      .from(users)
      .where(
        and(
          sql`LOWER(${users.username}) LIKE LOWER(${`%${query}%`})`,
          sql`${users.id} != ${currentUserId}` // Exclude current user from search
        )
      )
      .limit(10);

    return searchResults;
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

  async createFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await this.db
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: "pending"
      })
      .returning();
    return friendship;
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

  async kickMember(roomId: string, userId: string): Promise<void> {
    await this.db.delete(roomMembers).where(
      and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, userId)
      )
    );
  }

  async closeRoom(roomId: string): Promise<void> {
    await db.delete(roomMembers).where(eq(roomMembers.roomId, roomId));
    await db.delete(messages).where(eq(messages.roomId, roomId));
    await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
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
    const messageList = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        messageType: messages.messageType,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
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
      // First, get all messages where user is involved
      const allMessages = await this.db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          recipientId: messages.recipientId,
          messageType: messages.messageType,
          createdAt: messages.createdAt,
        })
        .from(messages)
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

      // Group by conversation and get the latest message for each
      const conversationMap = new Map();

      for (const msg of allMessages) {
        const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            lastMessage: msg.content,
            lastMessageType: msg.messageType,
            lastMessageTime: msg.createdAt,
          });
        }
      }

      // Now get user details for each conversation
      const conversationIds = Array.from(conversationMap.keys());
      if (conversationIds.length === 0) {
        return [];
      }

      const userDetails = await this.db
        .select({
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
        })
        .from(users)
        .where(inArray(users.id, conversationIds));

      // Combine conversation data with user details
      const conversations = userDetails.map(user => {
        const convData = conversationMap.get(user.id);
        return {
          id: user.id,
          username: user.username,
          level: user.level,
          isOnline: user.isOnline,
          lastMessage: convData.lastMessage,
          lastMessageType: convData.lastMessageType,
          lastMessageTime: convData.lastMessageTime,
        };
      });

      return conversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
    } catch (error) {
      console.error('Error getting DM conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  // User session methods for WebSocket
  async createUserSession(userId: string, socketId: string): Promise<UserSession> {
    const [session] = await this.db
      .insert(userSessions)
      .values({
        userId,
        socketId,
        isActive: true
      })
      .returning();
    return session;
  }

  async updateUserSession(sessionId: string, socketId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({
        socketId,
        updatedAt: new Date()
      })
      .where(eq(userSessions.id, sessionId));
  }

  async removeUserSession(socketId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.socketId, socketId));
  }

  async getUserBySocketId(socketId: string): Promise<User | undefined> {
    const result = await this.db
      .select({
        user: users
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.socketId, socketId),
          eq(userSessions.isActive, true)
        )
      );

    return result[0]?.user;
  }

  async createMessage(messageData: InsertMessage) {
    const [message] = await this.db
      .insert(messages)
      .values(messageData)
      .returning();

    // Get the message with sender info
    const messageWithSender = await this.db
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
      .where(eq(messages.id, message.id));

    return messageWithSender[0];
  }

  async createDirectMessage(data: { content: string; senderId: string; recipientId: string; messageType?: string }) {
    try {
      const [directMessage] = await this.db
        .insert(messages) // Changed from directMessages to messages
        .values({
          content: data.content,
          senderId: data.senderId, // Keep as string, let DB handle conversion if needed or adjust schema
          recipientId: data.recipientId, // Keep as string
          messageType: data.messageType || 'text',
          roomId: null // Explicitly set roomId to null for direct messages
        })
        .returning();

      // Get sender info for the response
      const sender = await this.getUser(data.senderId);

      return {
        ...directMessage,
        sender: sender ? {
          id: sender.id,
          username: sender.username,
          level: sender.level || 1,
          isOnline: sender.isOnline || false,
        } : null,
      };
    } catch (error) {
      console.error('Failed to create direct message:', error);
      throw error;
    }
  }

  async createRoom(roomData: InsertChatRoom, createdBy: string): Promise<ChatRoom> {
    try {
      const [room] = await this.db
        .insert(chatRooms)
        .values({
          ...roomData,
          createdBy,
        })
        .returning();

      // Automatically add creator as room member with role 'admin'
      await this.db
        .insert(roomMembers)
        .values({
          roomId: room.id,
          userId: createdBy,
          role: 'admin',
        });

      return room;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  async getAllRooms() {
    try {
      // Fetch rooms with creator details
      const rooms = await this.db.query.chatRooms.findMany({
        with: {
          creator: { // Assuming 'creator' is the relation defined in schema for chatRooms
            columns: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: (chatRooms, { desc }) => [desc(chatRooms.createdAt)],
      });

      return rooms;
    } catch (error) {
      console.error('Failed to get rooms:', error);
      return []; // Return empty array on error
    }
  }

  // Feed posts methods
  async getFeedPosts(): Promise<
    (Omit<typeof posts.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  > {
    const result = await this.db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
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
          profilePhotoUrl: users.profilePhotoUrl,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    return result;
  }

  async createFeedPost(postData: { content?: string; authorId: string; mediaType?: string; mediaUrl?: string }): Promise<typeof posts.$inferSelect> {
    const [post] = await this.db
      .insert(posts)
      .values({
        content: postData.content || null,
        authorId: postData.authorId,
        mediaType: postData.mediaType || "text",
        mediaUrl: postData.mediaUrl || null,
      })
      .returning();

    return post;
  }

  async likePost(postId: string, userId: string): Promise<void> {
    await this.db
      .insert(postLikes)
      .values({ postId, userId })
      .onConflictDoNothing();

    // Update likes count
    await this.db
      .update(posts)
      .set({
        likesCount: sql`${posts.likesCount} + 1`
      })
      .where(eq(posts.id, postId));
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await this.db
      .delete(postLikes)
      .where(
        and(
          eq(postLikes.postId, postId),
          eq(postLikes.userId, userId)
        )
      );

    // Update likes count
    await this.db
      .update(posts)
      .set({
        likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`
      })
      .where(eq(posts.id, postId));
  }

  async addComment(postId: string, commentData: { content: string; authorId: string }): Promise<typeof postComments.$inferSelect & { author: Pick<User, "id" | "username" | "level" | "isOnline"> }> {
    try {
      const [comment] = await db
        .insert(postComments)
        .values({
          id: crypto.randomUUID(),
          postId,
          content: commentData.content,
          authorId: commentData.authorId,
          createdAt: new Date(),
        })
        .returning();

      // Get the author information with a fresh query to ensure we have the latest data
      const authorData = await db
        .select({
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
          profilePhotoUrl: users.profilePhotoUrl,
        })
        .from(users)
        .where(eq(users.id, commentData.authorId))
        .limit(1);

      const author = authorData[0] || {
        id: commentData.authorId,
        username: 'Unknown User',
        level: 1,
        isOnline: false,
      };

      return {
        ...comment,
        author
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async getComments(postId: string): Promise<
    (Omit<typeof postComments.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  > {
    try {
      const commentsData = await db
        .select({
          id: postComments.id,
          content: postComments.content,
          createdAt: postComments.createdAt,
          authorId: postComments.authorId,
          postId: postComments.postId,
          authorUsername: users.username,
          authorLevel: users.level,
          authorIsOnline: users.isOnline,
          authorProfilePhotoUrl: users.profilePhotoUrl,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.postId, postId))
        .orderBy(asc(postComments.createdAt));

      return commentsData.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        authorId: comment.authorId,
        postId: comment.postId,
        author: {
          id: comment.authorId,
          username: comment.authorUsername || 'Unknown User',
          level: comment.authorLevel || 1,
          isOnline: comment.authorIsOnline || false,
          profilePhotoUrl: comment.authorProfilePhotoUrl,
        }
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  async getUserLikes(userId: string, postIds: string[]): Promise<string[]> {
    try {
      const likes = await this.db
        .select({
          postId: postLikes.postId
        })
        .from(postLikes)
        .where(
          and(
            eq(postLikes.userId, userId),
            inArray(postLikes.postId, postIds)
          )
        );

      return likes.map(like => like.postId);
    } catch (error) {
      console.error('Error fetching user likes:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();