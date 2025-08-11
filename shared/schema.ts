import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  country: varchar("country", { length: 10 }),
  gender: varchar("gender", { length: 10 }),
  level: integer("level").default(1),
  coins: integer("coins").default(1000), // Starting coins for new users
  bio: text("bio"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  status: text("status").default("online"),
  createdAt: timestamp("created_at").defaultNow(),
  profilePhotoUrl: text("profile_photo_url"),
  phoneNumber: varchar("phone_number", { length: 20 }), // Added phone number field
  fansCount: integer("fans_count").default(0),
  followingCount: integer("following_count").default(0),
  isMentor: boolean("is_mentor").default(false),
  mentorSpecialty: text("mentor_specialty"),
  isAdmin: boolean("is_admin").default(false),
  isBanned: boolean("is_banned").default(false),
  isSuspended: boolean("is_suspended").default(false),
});

export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: uuid("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  maxMembers: integer("max_members").default(25),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roomMembers = pgTable("room_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member"), // member, moderator, admin
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  roomId: uuid("room_id").references(() => chatRooms.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").references(() => users.id), // for direct messages
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, image, gift
  metadata: jsonb("metadata"), // for storing additional data like gift info
  createdAt: timestamp("created_at").defaultNow(),
});

// This table was in the original code but is not mentioned in the changes.
// Keeping it as is to avoid breaking existing functionality.
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  messageType: text("message_type").default("text"), // 'text', 'gift', 'media'
  giftData: text("gift_data"), // JSON string for gift information
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  socketId: text("socket_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content"),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaType: varchar("media_type", { length: 20 }).default("text"), // text, image, video
  mediaUrl: text("media_url"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id").references(() => postComments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Followers table
export const followers = pgTable('followers', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').notNull().references(() => users.id),
  followingId: uuid('following_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// New table for credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  recipientId: uuid("recipient_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for friends
export const friends = pgTable('friends', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendUserId: uuid('friend_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// New table for gifts
export const gifts = pgTable('gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  price: integer('price').notNull(),
  description: text('description'),
  emoji: varchar('emoji', { length: 10 }),
  fileUrl: text('file_url'),
  fileType: varchar('file_type', { length: 20 }), // 'png', 'json'
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  friendships: many(friendships, { relationName: "userFriendships" }),
  receivedFriendships: many(friendships, { relationName: "receivedFriendships" }),
  createdRooms: many(chatRooms),
  roomMemberships: many(roomMembers),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  sessions: many(userSessions),
  followers: many(followers, { relationName: "followers" }), // Added relation for followers
  following: many(followers, { relationName: "following" }), // Added relation for following
  notifications: many(notifications),
  friends: many(friends, { relationName: "userFriends" }), // Added relation for friends
  friendOf: many(friends, { relationName: "friendOf" }), // Added relation for friends
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: "userFriendships",
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: "receivedFriendships",
  }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [chatRooms.createdBy],
    references: [users.id],
  }),
  members: many(roomMembers),
  messages: many(messages),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(chatRooms, {
    fields: [roomMembers.roomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  room: one(chatRooms, {
    fields: [messages.roomId],
    references: [chatRooms.id],
  }),
}));

// Assuming directMessages also needs relations similar to messages
export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [postComments.authorId],
    references: [users.id],
  }),
}));

// Relation for the followers table
export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
    relationName: "followers",
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Relation for notifications
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
}));

// Relation for the friends table
export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: "userFriends",
  }),
  friend: one(users, {
    fields: [friends.friendUserId],
    references: [users.id],
    relationName: "friendOf",
  }),
}));

// Relation for the gifts table
export const giftsRelations = relations(gifts, ({ one }) => ({
  // Add relations if needed in the future
}));


// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  country: true,
  gender: true,
}).extend({
  username: z.string()
    .min(4, "Username must be at least 4 characters")
    .max(12, "Username must be at most 12 characters")
    .regex(/^[a-z0-9.]+$/, "Username can only contain lowercase letters, numbers, and dots")
    .refine((val) => !val.startsWith('.') && !val.endsWith('.'), {
      message: "Username cannot start or end with a dot"
    })
    .refine((val) => !val.includes('..'), {
      message: "Username cannot contain consecutive dots"
    })
});

export const insertFriendshipSchema = createInsertSchema(friendships).pick({
  friendId: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).pick({
  name: true,
  description: true,
  isPublic: true,
  maxMembers: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  senderId: true,
  roomId: true,
  recipientId: true,
  messageType: true,
  metadata: true,
});

// Schema for direct messages, including gift data
export const insertDirectMessageSchema = createInsertSchema(directMessages).pick({
  content: true,
  senderId: true,
  recipientId: true,
  messageType: true,
  giftData: true,
});


export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  authorId: true,
  mediaType: true,
  mediaUrl: true,
});
export const insertCommentSchema = createInsertSchema(postComments).pick({
  postId: true,
  authorId: true,
  content: true,
  parentCommentId: true,
});



// Schema for followers
export const insertFollowerSchema = createInsertSchema(followers).pick({
  followerId: true,
  followingId: true,
});

// Schema for credit transactions
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  senderId: true,
  recipientId: true,
  amount: true,
});

// Schema for notifications
export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  fromUserId: true,
  data: true,
});

// Schema for friends
export const insertFriendSchema = createInsertSchema(friends).pick({
  friendUserId: true,
});

// Schema for gifts
export const insertGiftSchema = createInsertSchema(gifts).pick({
  name: true,
  price: true,
  description: true,
  emoji: true,
  fileUrl: true,
  fileType: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type RoomMember = typeof roomMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Follower = typeof followers.$inferSelect;
export type InsertFollower = z.infer<typeof insertFollowerSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Gift = typeof gifts.$inferSelect;
export type InsertGift = z.infer<typeof insertGiftSchema>;