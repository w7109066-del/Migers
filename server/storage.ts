import {
  users,
  messages,
  chatRooms,
  roomMembers,
  userSessions,
  posts,
  postLikes,
  postComments,
  followers,
  creditTransactions,
  type User,
  type InsertUser,
  type Friendship,
  type InsertFriendship,
  type ChatRoom,
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type UserSession,
  type Follower,
  type CreditTransaction,
  type InsertCreditTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, exists, count, inArray, sql, asc, isNull } from "drizzle-orm";
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
  updateUserProfile(userId: string, profileData: { bio?: string | null; country?: string | null; profilePhotoUrl?: string | null }): Promise<void>;
  updateUserCoins(userId: string, newCoinAmount: number): Promise<User | undefined>;
  updateUserMentorStatus(userId: string, isMentor: boolean, specialty?: string): Promise<User | undefined>;
  getMentors(): Promise<User[]>;
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  getAdmins(): Promise<User[]>;
  banUser(userId: string): Promise<User | undefined>;
  unbanUser(userId: string): Promise<User | undefined>;
  suspendUser(userId: string): Promise<User | undefined>;
  unsuspendUser(userId: string): Promise<User | undefined>;
  updateUserPassword(userId: string, newPassword: string): Promise<User | undefined>;


  // Friends management
  getFriends(userId: string): Promise<(User & { friendshipStatus: string })[]>;
  refreshFriendsList(userId: string): Promise<(User & { friendshipStatus: string })[]>;
  addFriend(userId: string, friendId: string): Promise<Friendship>;
  getFriendshipStatus(userId: string, friendId: string): Promise<Friendship | undefined>;
  createFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(userId: string, friendId: string): Promise<void>;
  rejectFriendRequest(userId: string, friendId: string): Promise<void>;

  // Followers management
  followUser(followerId: string, followingId: string): Promise<Follower>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFansCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;


  // Chat rooms
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(roomId: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  createRoom(roomData: InsertChatRoom, createdBy: string): Promise<ChatRoom>;
  getAllRooms(): Promise<ChatRoom[]>;
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;
  kickMember(roomId: string, userId: string): Promise<void>;
  closeRoom(roomId: string): Promise<void>;

  // Messages
  getRoomMessages(roomId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  getDirectMessages(userId: string, otherUserId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message & { sender: User }>;
  createDirectMessage(data: { content: string; senderId: string; recipientId: string; messageType?: string }): Promise<Message & { sender: User }>;
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
          and(eq(friendships.userId, userId), eq(users.id, friendships.friendId))
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

  // Followers management
  async followUser(followerId: string, followingId: string): Promise<Follower> {
    const [newFollower] = await this.db
      .insert(followers)
      .values({ followerId, followingId })
      .returning();
    return newFollower;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.db.delete(followers).where(
      and(
        eq(followers.followerId, followerId),
        eq(followers.followingId, followingId)
      )
    );
  }

  async getFansCount(userId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(followers)
        .where(eq(followers.followingId, userId));

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting fans count:', error);
      return 0;
    }
  }

  async getFollowingCount(userId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(followers)
        .where(eq(followers.followerId, userId));

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      );
    return result.length > 0;
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
      console.log(`Getting DM conversations for user: ${userId}`);
      
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

      console.log(`Found ${allMessages.length} direct messages for user ${userId}`);

      // Group by conversation and get the latest message for each
      const conversationMap = new Map();

      for (const msg of allMessages) {
        const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId;

        if (otherUserId && !conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            lastMessage: msg.content,
            lastMessageType: msg.messageType,
            lastMessageTime: msg.createdAt,
          });
        }
      }

      console.log(`Found ${conversationMap.size} unique conversations`);

      // Now get user details for each conversation
      const conversationIds = Array.from(conversationMap.keys()).filter(id => id !== null && id !== undefined);

      if (conversationIds.length === 0) {
        console.log('No conversations found');
        return [];
      }

      const userDetails = await this.db
        .select({
          id: users.id,
          username: users.username,
          level: users.level,
          isOnline: users.isOnline,
          country: users.country,
          profilePhotoUrl: users.profilePhotoUrl,
          status: users.status,
        })
        .from(users)
        .where(inArray(users.id, conversationIds));

      console.log(`Found user details for ${userDetails.length} users`);

      // Combine conversation data with user details
      const conversations = await Promise.all(userDetails.map(async user => {
        const convData = conversationMap.get(user.id);
        if (!convData) return null;

        try {
          const fans = await this.getFansCount(user.id);
          const following = await this.getFollowingCount(user.id);

          return {
            id: user.id,
            username: user.username || 'Unknown User',
            level: user.level || 1,
            isOnline: user.isOnline || false,
            status: user.status || 'offline',
            country: user.country || 'Unknown',
            profilePhotoUrl: user.profilePhotoUrl || null,
            lastMessage: convData.lastMessage || '',
            lastMessageType: convData.lastMessageType || 'text',
            lastMessageTime: convData.lastMessageTime,
            fans: fans || 0,
            following: following || 0,
          };
        } catch (error) {
          console.error('Error getting user stats for conversation:', error);
          return {
            id: user.id,
            username: user.username || 'Unknown User',
            level: user.level || 1,
            isOnline: user.isOnline || false,
            status: user.status || 'offline',
            country: user.country || 'Unknown',
            profilePhotoUrl: user.profilePhotoUrl || null,
            lastMessage: convData.lastMessage || '',
            lastMessageType: convData.lastMessageType || 'text',
            lastMessageTime: convData.lastMessageTime,
            fans: 0,
            following: 0,
          };
        }
      }));

      // Filter out null conversations and sort
      const validConversations = conversations.filter(conv => conv !== null);

      console.log(`Returning ${validConversations.length} valid conversations`);
      return validConversations.sort((a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
    } catch (error) {
      console.error('Error getting DM conversations:', error);
      // Return empty array instead of throwing to prevent API errors
      return [];
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

  async createMessage(messageData: InsertMessage): Promise<Message & { sender: User }> {
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
        .insert(messages)
        .values({
          content: data.content,
          senderId: data.senderId,
          recipientId: data.recipientId,
          messageType: data.messageType || 'text',
          roomId: null
        })
        .returning();

      const sender = await this.getUser(data.senderId);

      // Fetch follower counts for the sender and recipient
      const followerCount = await this.getFollowerCount(data.senderId);
      const followingCount = await this.getFollowingCount(data.senderId);
      const recipientFollowerCount = await this.getFollowerCount(data.recipientId);
      const recipientFollowingCount = await this.getFollowingCount(data.recipientId);

      return {
        ...directMessage,
        sender: sender ? {
          id: sender.id,
          username: sender.username,
          level: sender.level || 1,
          isOnline: sender.isOnline || false,
          country: sender.country,
          profilePhotoUrl: sender.profilePhotoUrl,
          fans: followerCount,
          following: followingCount,
        } : null,
        recipient: {
          id: data.recipientId,
          fans: recipientFollowerCount,
          following: recipientFollowingCount,
        }
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
      const rooms = await this.db.query.chatRooms.findMany({
        with: {
          creator: {
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
      return [];
    }
  }

  // Feed posts methods
  async getFeedPosts(): Promise<
    (Omit<typeof posts.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  > {
    try {
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
        .limit(20);

      return result;
    } catch (error) {
      console.error('Error fetching feed posts:', error);
      return [];
    }
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

    await this.db
      .update(posts)
      .set({
        likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`
      })
      .where(eq(posts.id, postId));
  }

  async addComment(postId: string, commentData: { content: string; authorId: string; parentCommentId?: string | null }): Promise<typeof postComments.$inferSelect & { author: Pick<User, "id" | "username" | "level" | "isOnline"> }> {
    try {
      const newComment = await db
        .insert(postComments)
        .values({
          postId,
          content: commentData.content,
          authorId: commentData.authorId,
          parentCommentId: commentData.parentCommentId || null,
        })
        .returning();

      const [commentWithAuthor] = await db
        .select({
          id: postComments.id,
          content: postComments.content,
          createdAt: postComments.createdAt,
          parentCommentId: postComments.parentCommentId,
          author: {
            id: users.id,
            username: users.username,
            level: users.level,
            profilePhotoUrl: users.profilePhotoUrl,
          },
          likesCount: sql<number>`0`,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.id, newComment[0].id));

      return commentWithAuthor;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  async getComments(postId: string): Promise<
    (Omit<typeof postComments.$inferSelect, "updatedAt"> & {
      author: Pick<User, "id" | "username" | "level" | "isOnline">;
    })[]
  > {
    try {
      const allComments = await db
        .select({
          id: postComments.id,
          content: postComments.content,
          createdAt: postComments.createdAt,
          parentCommentId: postComments.parentCommentId,
          author: {
            id: users.id,
            username: users.username,
            level: users.level,
            profilePhotoUrl: users.profilePhotoUrl,
          },
          likesCount: sql<number>`0`,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.postId, postId))
        .orderBy(desc(postComments.createdAt));

      const commentMap = new Map();
      const topLevelComments = [];

      allComments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      allComments.forEach(comment => {
        if (comment.parentCommentId) {
          const parent = commentMap.get(comment.parentCommentId);
          if (parent) {
            parent.replies.push(commentMap.get(comment.id));
          }
        } else {
          topLevelComments.push(commentMap.get(comment.id));
        }
      });

      return topLevelComments;
    } catch (error) {
      console.error("Error fetching comments:", error);
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

  async updateUserMentorStatus(userId: string, isMentor: boolean, specialty?: string): Promise<User | undefined> {
    try {
      const updateData: any = {
        isMentor,
        mentorSpecialty: specialty || null
      };

      const [updatedUser] = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('Error updating mentor status:', error);
      return undefined;
    }
  }

  async getMentors(): Promise<User[]> {
    try {
      const mentors = await this.db
        .select()
        .from(users)
        .where(eq(users.isMentor, true));

      return mentors;
    } catch (error) {
      console.error('Error fetching mentors:', error);
      return [];
    }
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.getFansCount(userId);
  }

  async checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
    return this.isFollowing(followerId, followingId);
  }

  async updateUserCoins(userId: string, newCoinAmount: number): Promise<User | undefined> {
    try {
      const [updatedUser] = await this.db
        .update(users)
        .set({ coins: newCoinAmount })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('Error updating user coins:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
    return user || null;
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const updatedUser = await db.update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async banUser(userId: string): Promise<User | undefined> {
    const updatedUser = await db.update(users)
      .set({ isBanned: true })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async unbanUser(userId: string): Promise<User | undefined> {
    const updatedUser = await db.update(users)
      .set({ isBanned: false })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async suspendUser(userId: string): Promise<User | undefined> {
    const updatedUser = await db.update(users)
      .set({ isSuspended: true })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async unsuspendUser(userId: string): Promise<User | undefined> {
    const updatedUser = await db.update(users)
      .set({ isSuspended: false })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  }

  async getAdmins(): Promise<User[]> {
    try {
      const admins = await this.db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true));

      return admins;
    } catch (error) {
      console.error('Error fetching admins:', error);
      return [];
    }
  }

  async transferCoins(senderId: string, recipientId: string, amount: number): Promise<void> {
    // Start transaction
    await this.db.transaction(async (tx) => {
      // Deduct from sender
      await tx.update(users)
        .set({ coins: sql`${users.coins} - ${amount}` })
        .where(eq(users.id, senderId));

      // Add to recipient
      await tx.update(users)
        .set({ coins: sql`${users.coins} + ${amount}` })
        .where(eq(users.id, recipientId));

      // Record the transaction
      await tx.insert(creditTransactions)
        .values({
          senderId,
          recipientId,
          amount,
        });
    });
  }

  async getCreditTransactionHistory(userId: string): Promise<any[]> {
    try {
      // Get all transactions where user is either sender or recipient
      const sentTransactions = await this.db
        .select({
          id: creditTransactions.id,
          type: sql<string>`'sent'`,
          amount: creditTransactions.amount,
          otherUserId: creditTransactions.recipientId,
          createdAt: creditTransactions.createdAt,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.senderId, userId));

      const receivedTransactions = await this.db
        .select({
          id: creditTransactions.id,
          type: sql<string>`'received'`,
          amount: creditTransactions.amount,
          otherUserId: creditTransactions.senderId,
          createdAt: creditTransactions.createdAt,
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.recipientId, userId));

      // Combine and get user details for other users
      const allTransactions = [...sentTransactions, ...receivedTransactions];

      if (allTransactions.length === 0) {
        return [];
      }

      // Get unique other user IDs
      const otherUserIds = [...new Set(allTransactions.map(t => t.otherUserId))];

      // Get usernames for other users
      const otherUsers = await this.db
        .select({
          id: users.id,
          username: users.username,
        })
        .from(users)
        .where(inArray(users.id, otherUserIds));

      const userMap = new Map(otherUsers.map(u => [u.id, u.username]));

      // Map transactions with usernames
      const transactionsWithUsernames = allTransactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        otherUser: userMap.get(transaction.otherUserId) || 'Unknown User',
        createdAt: transaction.createdAt,
      }));

      // Sort by creation date (newest first)
      return transactionsWithUsernames.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting credit transaction history:', error);
      return [];
    }
  }

  async updateUser(userId: string, updates: Partial<User>) {
    try {
      const result = await this.db.update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Failed to update user:', error);
      return null;
    }
  }

  async updateUserPassword(userId: string, newPassword: string) {
    try {
      // In production, hash the password before storing
      const result = await this.db.update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Failed to update user password:', error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();