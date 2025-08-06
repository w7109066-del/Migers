import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChatRoomSchema, insertMessageSchema, insertFriendshipSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images and videos are allowed'));
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Friends API
  app.get("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const friends = await storage.getFriends(req.user!.id);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.post("/api/friends/refresh", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Refresh friends list with updated status
      const friends = await storage.refreshFriendsList(req.user!.id);

      res.json({
        message: "Friends list refreshed successfully",
        friends: friends,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Refresh friends error:', error);
      res.status(500).json({ message: "Failed to refresh friends list" });
    }
  });

  app.post("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { friendId } = insertFriendshipSchema.parse(req.body);
      const friendship = await storage.addFriend(req.user!.id, friendId);
      res.status(201).json(friendship);
    } catch (error) {
      res.status(400).json({ message: "Failed to add friend" });
    }
  });

  app.post("/api/friends/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { userId } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      await storage.acceptFriendRequest(req.user!.id, userId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(400).json({ message: "Failed to accept friend request" });
    }
  });

  app.post("/api/friends/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { userId } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      await storage.rejectFriendRequest(req.user!.id, userId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Reject friend request error:', error);
      res.status(400).json({ message: "Failed to reject friend request" });
    }
  });

  // Routes
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Send friend request
  app.post("/api/friends/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { userId } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if they're trying to add themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot add yourself as friend" });
      }

      // Check if friendship already exists
      const existingFriendship = await storage.getFriendshipStatus(req.user!.id, userId);
      if (existingFriendship) {
        return res.status(400).json({ message: "Friend request already exists or you are already friends" });
      }

      // Create friend request
      await storage.createFriendRequest(req.user!.id, userId);

      // Broadcast friend request notification to target user
      broadcastToUser(userId, {
        type: 'friend_request_received',
        fromUser: {
          id: req.user!.id,
          username: req.user!.username,
        },
      });

      res.json({ message: "Friend request sent successfully" });
    } catch (error) {
      console.error('Friend request error:', error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });


  // Chat rooms API
  app.get("/api/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get actual member counts for mock rooms
      const getRoomMemberCount = (roomId: string) => {
        if (['1', '2', '3', '4'].includes(roomId)) {
          const roomMembers = mockRoomMembers.get(roomId);
          return roomMembers ? roomMembers.size : 0;
        }
        return 0;
      };

      const mockRooms = [
        {
          id: "1",
          name: "MeChat",
          description: "Official main chat room",
          memberCount: getRoomMemberCount("1"),
          capacity: 25,
          isOfficial: true,
          category: "official",
          isPrivate: false
        },
        {
          id: "2", 
          name: "Indonesia",
          description: "Chat for Indonesian users",
          memberCount: getRoomMemberCount("2"),
          capacity: 25,
          isOfficial: false,
          category: "recent",
          isPrivate: false
        },
        {
          id: "3",
          name: "MeChat",
          description: "Your favorite chat room",
          memberCount: getRoomMemberCount("3"),
          capacity: 25,
          isOfficial: true,
          category: "favorite", 
          isPrivate: false
        },
        {
          id: "4",
          name: "lowcard",
          description: "Card game room",
          memberCount: getRoomMemberCount("4"),
          capacity: 25,
          isOfficial: false,
          category: "game",
          isPrivate: false
        }
      ];

      res.json(mockRooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const roomData = insertChatRoomSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const room = await storage.createChatRoom(roomData);

      // Auto-join the creator to the room
      await storage.joinRoom(room.id, req.user!.id);

      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat room" });
    }
  });

  app.post("/api/rooms/:roomId/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { roomId } = req.params;

      // For mock rooms (1-4), just return success without database operation
      if (['1', '2', '3', '4'].includes(roomId)) {
        res.json({ 
          success: true, 
          message: "Successfully joined room",
          roomId: roomId 
        });
        return;
      }

      // For real rooms, use storage
      await storage.joinRoom(roomId, req.user!.id);
      res.json({ 
        success: true, 
        message: "Successfully joined room",
        roomId: roomId 
      });
    } catch (error) {
      console.error('Join room error:', error);
      res.status(400).json({ message: "Failed to join room" });
    }
  });

  app.post("/api/rooms/:roomId/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.leaveRoom(req.params.roomId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Failed to leave room" });
    }
  });

  app.get("/api/rooms/:roomId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { roomId } = req.params;

      // For mock rooms (1-4), return actual users in room
      if (['1', '2', '3', '4'].includes(roomId)) {
        const roomMembers = mockRoomMembers.get(roomId) || new Map();
        const memberIds = Array.from(roomMembers.keys());
        
        if (memberIds.length === 0) {
          res.json([]);
          return;
        }

        // Get user details for all members
        const users = await Promise.all(
          memberIds.map(async (userId) => {
            const user = await storage.getUser(userId);
            return user ? {
              user: {
                id: user.id,
                username: user.username,
                level: user.level,
                isOnline: user.isOnline,
              }
            } : null;
          })
        );

        // Filter out null users and return
        res.json(users.filter(Boolean));
        return;
      }

      // For real rooms, get actual members
      const members = await storage.getRoomMembers(roomId);
      res.json(members);
    } catch (error) {
      console.error('Get room members error:', error);
      res.status(500).json({ message: "Failed to fetch room members" });
    }
  });

  app.get("/api/rooms/:roomId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const messages = await storage.getRoomMessages(req.params.roomId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Direct messages API
  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { userId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const messages = await storage.getDirectMessages(req.user!.id, userId);
      res.json(messages);
    } catch (error) {
      console.error('Direct messages error:', error);
      res.status(500).json({ message: "Failed to fetch direct messages" });
    }
  });

  // Get all DM conversations for current user
  app.get("/api/messages/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    if (!req.user?.id) {
      return res.status(400).json({ message: "User ID not found in session" });
    }

    try {
      const conversations = await storage.getDirectMessageConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Direct message routes
  app.get("/api/messages/direct/:recipientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { recipientId } = req.params;
    const messages = await storage.getDirectMessages(req.user!.id, recipientId);
    res.json(messages);
  });

  app.post("/api/messages/direct", upload.single('media'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { content, recipientId } = req.body;
      let messageType = 'text';
      let mediaUrl = null;

      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
        messageType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      }

      // Validate required fields
      if (!recipientId) {
        return res.status(400).json({ message: "Recipient ID is required" });
      }

      if (!content?.trim() && !req.file) {
        return res.status(400).json({ message: "Message must have content or media" });
      }

      const message = await storage.createDirectMessage({
        content: content?.trim() || '',
        senderId: req.user!.id,
        recipientId,
        messageType
      });

      // Only broadcast to recipient - sender will get their message through API response
      broadcastToUser(recipientId, {
        type: 'new_direct_message',
        message: message,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Direct message error:', error);
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // User search API
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const users = await storage.searchUsers(q.trim(), req.user!.id);
      res.json(users);
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // User status API
  app.patch("/api/user/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { status } = req.body;

      // Validate status values
      const validStatuses = ['online', 'offline', 'away', 'busy'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      // Update both status and online status based on the new status
      const isOnline = status !== 'offline';
      await storage.updateUserStatus(req.user!.id, status);
      await storage.updateUserOnlineStatus(req.user!.id, isOnline);

      res.json({ status, isOnline });
    } catch (error) {
      console.error('Status update error:', error);
      res.status(400).json({ message: "Failed to update status" });
    }
  });

  // Update user status message
  app.patch("/api/user/status-message", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { statusMessage } = req.body;

      if (!statusMessage || typeof statusMessage !== 'string') {
        return res.status(400).json({ message: "Status message is required" });
      }

      if (statusMessage.length > 200) {
        return res.status(400).json({ message: "Status message is too long (max 200 characters)" });
      }

      await storage.updateUserStatusMessage(req.user!.id, statusMessage.trim());

      res.json({ statusMessage: statusMessage.trim() });
    } catch (error) {
      console.error('Status message update error:', error);
      res.status(400).json({ message: "Failed to update status message" });
    }
  });

  // Feed posts API
  app.get("/api/feed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const posts = await storage.getFeedPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feed posts" });
    }
  });

  app.post("/api/feed", upload.single('media'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { content } = req.body;
      let mediaType = 'text';
      let mediaUrl = null;

      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      }

      // Ensure at least content or media is provided
      if (!content?.trim() && !req.file) {
        return res.status(400).json({ message: "Post must have content or media" });
      }

      const post = await storage.createFeedPost({
        content: content?.trim() || null,
        authorId: req.user!.id,
        mediaType,
        mediaUrl,
      });
      res.status(201).json(post);
    } catch (error) {
      console.error('Post creation error:', error);
      res.status(400).json({ message: "Failed to create post" });
    }
  });

  // Post interactions API
  app.post("/api/feed/:postId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.likePost(req.params.postId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Failed to like post" });
    }
  });

  app.delete("/api/feed/:postId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.unlikePost(req.params.postId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Failed to unlike post" });
    }
  });

  app.post("/api/feed/:postId/comment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { content } = req.body;
      const comment = await storage.addComment(req.params.postId, {
        content,
        authorId: req.user!.id,
      });
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/feed/:postId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const comments = await storage.getComments(req.params.postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // Track users in mock rooms with detailed user info
  const mockRoomMembers = new Map<string, Map<string, any>>();
  
  // Track websocket connections by user ID
  const userConnections = new Map<string, WebSocket>();

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    let userId: string | null = null;
    let userSession: any = null;
    let currentRoomId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'authenticate':
            // Simple authentication using session
            // In production, you'd want proper JWT or session validation
            if (message.userId) {
              userId = message.userId;
              userSession = await storage.createUserSession(userId, generateSocketId());
              await storage.updateUserOnlineStatus(userId, true);
              
              // Track this user's connection
              userConnections.set(userId, ws);

              ws.send(JSON.stringify({
                type: 'authenticated',
                success: true,
              }));
            }
            break;

          case 'join_room':
            if (userId && message.roomId && typeof message.roomId === 'string') {
              // Check room capacity (25 users max)
              const roomMemberCount = await getRoomMemberCount(message.roomId);
              if (roomMemberCount >= 25) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Room is full (maximum 25 users)',
                }));
                break;
              }

              // For mock rooms (1-4), track in memory with user data
              if (['1', '2', '3', '4'].includes(message.roomId)) {
                if (!mockRoomMembers.has(message.roomId)) {
                  mockRoomMembers.set(message.roomId, new Map());
                }
                const currentUser = await storage.getUser(userId);
                mockRoomMembers.get(message.roomId)!.set(userId, {
                  id: userId,
                  username: currentUser?.username || 'User',
                  level: currentUser?.level || 1,
                  isOnline: true
                });
                currentRoomId = message.roomId;
                
                console.log(`User ${currentUser?.username} joined room ${message.roomId}. Total members:`, mockRoomMembers.get(message.roomId)!.size);
              } else {
                await storage.joinRoom(message.roomId, userId);
              }

              // Get user data to ensure username is available
              const currentUser = await storage.getUser(userId);
              if (!currentUser) {
                return; // Should not happen if userId is valid
              }

              // Get room name for welcome message
              const roomNames = {
                '1': 'MeChat',
                '2': 'Indonesia', 
                '3': 'MeChat',
                '4': 'lowcard'
              };
              const roomName = roomNames[message.roomId as keyof typeof roomNames] || 'room';

              // Broadcast welcome message first
              broadcastToRoom(message.roomId, {
                type: 'new_message',
                message: {
                  id: `system-welcome-${Date.now()}`,
                  content: `Selamat datang di room ${roomName}`,
                  senderId: 'system',
                  roomId: message.roomId,
                  recipientId: null,
                  messageType: 'system',
                  createdAt: new Date().toISOString(),
                  sender: {
                    id: 'system',
                    username: 'System',
                    level: 0,
                    isOnline: true,
                  }
                }
              });

              // Broadcast system message about user joining
              broadcastToRoom(message.roomId, {
                type: 'new_message',
                message: {
                  id: `system-join-${Date.now()}`,
                  content: `${currentUser.username} has entered`,
                  senderId: 'system',
                  roomId: message.roomId,
                  recipientId: null,
                  messageType: 'system',
                  createdAt: new Date().toISOString(),
                  sender: {
                    id: 'system',
                    username: 'System',
                    level: 0,
                    isOnline: true,
                  }
                }
              });

              // Broadcast to room members
              broadcastToRoom(message.roomId, {
                type: 'user_joined',
                userId,
                roomId: message.roomId,
              }, ws);
            }
            break;

          case 'leave_room':
            if (userId && message.roomId && typeof message.roomId === 'string') {
              // Get user data for system message before leaving
              const user = await storage.getUser(userId);

              // For mock rooms (1-4), remove from memory tracking
              if (['1', '2', '3', '4'].includes(message.roomId)) {
                if (mockRoomMembers.has(message.roomId)) {
                  mockRoomMembers.get(message.roomId)!.delete(userId);
                }
                currentRoomId = null;
              } else {
                await storage.leaveRoom(message.roomId, userId);
              }

              // Broadcast system message about user leaving
              broadcastToRoom(message.roomId, {
                type: 'new_message',
                message: {
                  id: `system-leave-${Date.now()}`,
                  content: `${user?.username || 'User'} has left`,
                  senderId: 'system',
                  roomId: message.roomId,
                  recipientId: null,
                  messageType: 'system',
                  createdAt: new Date().toISOString(),
                  sender: {
                    id: 'system',
                    username: 'System',
                    level: 0,
                    isOnline: true,
                  }
                }
              });

              // Broadcast to room members
              broadcastToRoom(message.roomId, {
                type: 'user_left',
                userId,
                roomId: message.roomId,
              }, ws);
            }
            break;

          case 'send_message':
            if (userId && message.content) {
              if (message.roomId) {
                // For mock rooms (1-4), create a mock message instead of using database
                if (['1', '2', '3', '4'].includes(message.roomId)) {
                  // Get user data for the mock message
                  const user = await storage.getUser(userId);

                  const mockMessage = {
                    id: `mock-${Date.now()}`,
                    content: message.content,
                    senderId: userId,
                    roomId: message.roomId,
                    recipientId: null,
                    messageType: message.messageType || 'text',
                    metadata: message.metadata || null,
                    createdAt: new Date().toISOString(),
                    sender: {
                      id: userId,
                      username: user?.username || 'User',
                      level: user?.level || 1,
                      isOnline: user?.isOnline || true,
                    }
                  };

                  // Broadcast to room
                  broadcastToRoom(message.roomId, {
                    type: 'new_message',
                    message: mockMessage,
                  });
                } else {
                  // Real room message
                  const messageData = insertMessageSchema.parse({
                    content: message.content,
                    senderId: userId,
                    roomId: message.roomId,
                    recipientId: null,
                    messageType: message.messageType || 'text',
                    metadata: message.metadata || null,
                  });

                  const newMessage = await storage.createMessage(messageData);

                  // Broadcast to room
                  broadcastToRoom(message.roomId, {
                    type: 'new_message',
                    message: newMessage,
                  });
                }
              } else if (message.recipientId) {
                // Direct message
                const directMessage = await storage.createDirectMessage({
                  content: message.content,
                  senderId: userId,
                  recipientId: message.recipientId,
                  messageType: message.messageType || 'text'
                });

                // Send to recipient
                broadcastToUser(message.recipientId, {
                  type: 'new_direct_message',
                  message: directMessage,
                });

                // Send confirmation to sender
                ws.send(JSON.stringify({
                  type: 'message_sent',
                  message: directMessage,
                }));
              }
            }
            break;

          case 'typing':
            if (userId && message.roomId) {
              broadcastToRoom(message.roomId, {
                type: 'user_typing',
                userId,
                roomId: message.roomId,
                isTyping: message.isTyping,
              }, ws);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Message processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    ws.on('close', async () => {
      if (userId) {
        // Remove from user connections tracking
        userConnections.delete(userId);
        
        await storage.updateUserOnlineStatus(userId, false);
        if (userSession) {
          await storage.removeUserSession(userSession.socketId);
        }

        // Clean up mock room membership
        if (currentRoomId && ['1', '2', '3', '4'].includes(currentRoomId)) {
          if (mockRoomMembers.has(currentRoomId)) {
            const user = await storage.getUser(userId);
            mockRoomMembers.get(currentRoomId)!.delete(userId);
            
            console.log(`User ${user?.username} left room ${currentRoomId}. Remaining members:`, mockRoomMembers.get(currentRoomId)!.size);

            // Broadcast system message about user leaving
            broadcastToRoom(currentRoomId, {
              type: 'new_message',
              message: {
                id: `system-leave-${Date.now()}`,
                content: `${user?.username || 'User'} has left`,
                senderId: 'system',
                roomId: currentRoomId,
                recipientId: null,
                messageType: 'system',
                createdAt: new Date().toISOString(),
                sender: {
                  id: 'system',
                  username: 'System',
                  level: 0,
                  isOnline: true,
                }
              }
            });
          }
        }
      }
      console.log('WebSocket connection closed');
    });
  });

  function generateSocketId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  async function getRoomMemberCount(roomId: string): Promise<number> {
    // For mock rooms, return actual member count
    if (['1', '2', '3', '4'].includes(roomId)) {
      const roomMembers = mockRoomMembers.get(roomId);
      return roomMembers ? roomMembers.size : 0;
    }

    try {
      const members = await storage.getRoomMembers(roomId);
      return members?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    // For mock rooms, get actual members and send only to them
    if (['1', '2', '3', '4'].includes(roomId) && mockRoomMembers.has(roomId)) {
      const roomMembers = mockRoomMembers.get(roomId)!;
      roomMembers.forEach((memberData, memberId) => {
        const memberWs = userConnections.get(memberId);
        if (memberWs && memberWs !== excludeWs && memberWs.readyState === WebSocket.OPEN) {
          memberWs.send(JSON.stringify(message));
        }
      });
    } else {
      // For other rooms, broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  function broadcastToUser(userId: string, message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // In a real implementation, you'd track userId to WebSocket mapping
        // For now, broadcasting to all clients and letting the frontend filter
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}