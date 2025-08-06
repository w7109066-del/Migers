import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChatRoomSchema, insertMessageSchema, insertFriendshipSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

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
      const messages = await storage.getDirectMessages(req.user!.id, req.params.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch direct messages" });
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

  app.post("/api/feed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { content } = req.body;
      const post = await storage.createFeedPost({
        content,
        authorId: req.user!.id,
      });
      res.status(201).json(post);
    } catch (error) {
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
