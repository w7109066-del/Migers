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

  app.patch("/api/friends/:friendId/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.acceptFriendRequest(req.user!.id, req.params.friendId);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Failed to accept friend request" });
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

      // TODO: Implement friend request logic in storage
      // For now, just return success
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
      const rooms = await storage.getChatRooms();
      res.json(rooms);
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
      await storage.joinRoom(req.params.roomId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
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
      const members = await storage.getRoomMembers(req.params.roomId);
      res.json(members);
    } catch (error) {
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

  // Direct message routes
  app.get("/api/messages/direct/:recipientId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { recipientId } = req.params;
    const messages = await storage.getDirectMessages(req.user!.id, recipientId);
    res.json(messages);
  });

  app.post("/api/messages/direct", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { content, recipientId } = req.body;

    try {
      const message = await storage.createDirectMessage({
        content,
        senderId: req.user!.id,
        recipientId,
        messageType: "text"
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // User status API
  app.patch("/api/user/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { status } = req.body;
      await storage.updateUserStatus(req.user!.id, status);
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Failed to update status" });
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

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    let userId: string | null = null;
    let userSession: any = null;

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

              ws.send(JSON.stringify({
                type: 'authenticated',
                success: true,
              }));
            }
            break;

          case 'join_room':
            if (userId && message.roomId && typeof message.roomId === 'string') {
              await storage.joinRoom(message.roomId, userId);

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
              await storage.leaveRoom(message.roomId, userId);

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
              const messageData = insertMessageSchema.parse({
                content: message.content,
                senderId: userId,
                roomId: message.roomId || null,
                recipientId: message.recipientId || null,
                messageType: message.messageType || 'text',
                metadata: message.metadata || null,
              });

              const newMessage = await storage.createMessage(messageData);

              if (message.roomId) {
                // Broadcast to room
                broadcastToRoom(message.roomId, {
                  type: 'new_message',
                  message: newMessage,
                });
              } else if (message.recipientId) {
                // Send direct message
                broadcastToUser(message.recipientId, {
                  type: 'new_direct_message',
                  message: newMessage,
                });

                // Send confirmation to sender
                ws.send(JSON.stringify({
                  type: 'message_sent',
                  message: newMessage,
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
          message: 'Invalid message format',
        }));
      }
    });

    ws.on('close', async () => {
      if (userId) {
        await storage.updateUserOnlineStatus(userId, false);
        if (userSession) {
          await storage.removeUserSession(userSession.socketId);
        }
      }
      console.log('WebSocket connection closed');
    });
  });

  function generateSocketId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        // In a real implementation, you'd track which users are in which rooms
        client.send(JSON.stringify(message));
      }
    });
  }

  function broadcastToUser(userId: string, message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // In a real implementation, you'd track userId to WebSocket mapping
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}