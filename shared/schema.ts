import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, jsonb } from "drizzle-orm/pg-core";
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
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  status: text("status").default(""),
  createdAt: timestamp("created_at").defaultNow(),
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
  maxMembers: integer("max_members").default(100),
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

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  socketId: text("socket_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  country: true,
  gender: true,
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
export type UserSession = typeof userSessions.$inferSelect;
