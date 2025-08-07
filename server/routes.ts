import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChatRoomSchema, insertMessageSchema, insertFriendshipSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";
import { eq, desc, and, or, exists, count, inArray, sql, asc, isNull } from "drizzle-orm";
import { db } from "./db";
import { directMessages, users, messages } from "@shared/schema";

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  next();
}

// Room access middleware - check if user is banned from rooms
function requireRoomAccess(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Check if user is banned from rooms
  if (req.user?.isBanned) {
    return res.status(403).json({ message: "You are banned from accessing chat rooms" });
  }
  
  next();
}

// Admin middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

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

  // User profile update endpoint
  app.put("/api/user/profile", requireAuth, upload.single('profilePhoto'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { bio, country } = req.body;

      let profilePhotoUrl = null;
      if (req.file) {
        profilePhotoUrl = `/uploads/${req.file.filename}`;
      }

      // Update user profile in database
      await storage.updateUserProfile(userId, {
        bio: bio || null,
        country: country || null,
        profilePhotoUrl
      });

      res.json({
        success: true,
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Rooms API endpoints
  app.get("/api/rooms", requireRoomAccess, async (req, res) => {
    try {
      // Get user-created rooms from database
      const userRooms = await storage.getAllRooms();

      // Return mock rooms data plus user-created rooms
      const mockRooms = [
        {
          id: "1",
          name: "MeChat",
          description: "Official main chat room",
          memberCount: 0,
          capacity: 25,
          isOfficial: true,
          category: "official",
          isPrivate: false
        },
        {
          id: "2", 
          name: "Indonesia",
          description: "Chat for Indonesian users",
          memberCount: 0,
          capacity: 25,
          isOfficial: false,
          category: "recent",
          isPrivate: false
        },
        {
          id: "3",
          name: "MeChat",
          description: "Your favorite chat room",
          memberCount: 0,
          capacity: 25,
          isOfficial: true,
          category: "favorite", 
          isPrivate: false
        },
        {
          id: "4",
          name: "lowcard",
          description: "Card game room",
          memberCount: 0,
          capacity: 25,
          isOfficial: false,
          category: "game",
          isPrivate: false
        }
      ];

      // Convert user rooms to the expected format
      const formattedUserRooms = userRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description || "",
        memberCount: 0,
        capacity: room.maxMembers || 25,
        isOfficial: false,
        category: "recent",
        isPrivate: !room.isPublic
      }));

      const allRooms = [...mockRooms, ...formattedUserRooms];
      res.json(allRooms);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", requireRoomAccess, async (req, res) => {
    try {
      const { name, description, isPublic = true, maxMembers = 25 } = req.body;
      const userId = req.user!.id;

      if (!name || !description) {
        return res.status(400).json({ message: "Name and description are required" });
      }

      // Validate room name length
      if (name.length > 50) {
        return res.status(400).json({ message: "Room name must be 50 characters or less" });
      }

      // Validate description length
      if (description.length > 200) {
        return res.status(400).json({ message: "Description must be 200 characters or less" });
      }

      const roomData = insertChatRoomSchema.parse({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        maxMembers
      });

      const newRoom = await storage.createRoom(roomData, userId);
      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Failed to create room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.post("/api/rooms/:roomId/join", requireRoomAccess, async (req, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.user!.id;

      // For mock rooms, just return success
      if (['1', '2', '3', '4'].includes(roomId)) {
        res.json({ 
          success: true, 
          message: "Successfully joined room",
          roomId 
        });
      } else {
        // For real rooms, use storage
        await storage.joinRoom(roomId, userId);
        res.json({ 
          success: true, 
          message: "Successfully joined room",
          roomId 
        });
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  app.get("/api/rooms/:roomId/members", requireRoomAccess, async (req, res) => {
    try {
      const { roomId } = req.params;

      // For mock rooms, return members from memory
      if (['1', '2', '3', '4'].includes(roomId)) {
        if (mockRoomMembers.has(roomId)) {
          const members = Array.from(mockRoomMembers.get(roomId)!.values()).map(userData => ({
            user: userData
          }));
          res.json(members);
        } else {
          res.json([]);
        }
      } else {
        // For real rooms, use storage (these should have valid UUID format)
        const members = await storage.getRoomMembers(roomId);
        res.json(members || []);
      }
    } catch (error) {
      console.error("Failed to fetch room members:", error);
      res.status(500).json({ message: "Failed to fetch room members" });
    }
  });

  // Gift endpoints
  app.post("/api/gifts/send", requireAuth, async (req, res) => {
    try {
      const { recipientId, giftId, giftName, price, quantity = 1, totalCost, emoji, category } = req.body;
      const senderId = req.user!.id;

      if (!recipientId || !giftId || !giftName || !price) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if sender has enough coins (assuming user has coins field)
      const sender = await db.query.users.findFirst({
        where: eq(users.id, senderId),
      });

      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }

      // Create direct message with gift info using storage method
      const giftMessage = `🎁 ${giftName} x${quantity} (${totalCost} coins)`;

      const directMessage = await storage.createDirectMessage({
        content: giftMessage,
        senderId,
        recipientId,
        messageType: 'gift'
      });

      // Send gift notification via WebSocket
      broadcastToUser(recipientId, {
        type: 'new_direct_message',
        message: directMessage,
      });

      res.json({
        success: true,
        message: "Gift sent successfully",
        data: directMessage
      });
    } catch (error) {
      console.error("Failed to send gift:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  // Feed endpoints
  app.get("/api/feed", requireAuth, async (req, res) => {
    try {
      console.log('Loading feed posts for user:', req.user!.id);
      const posts = await storage.getFeedPosts();
      console.log('Found posts:', posts.length);

      // Ensure we always return an array
      const safePosts = Array.isArray(posts) ? posts : [];

      // Add cache headers for better performance
      res.set({
        'Cache-Control': 'private, no-cache',
        'Content-Type': 'application/json'
      });

      res.json(safePosts);
    } catch (error) {
      console.error('Feed loading error:', error);
      res.status(500).json({ 
        message: "Failed to fetch feed posts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/feed", upload.single('media'), async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User not authenticated for post creation');
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { content } = req.body;
      let mediaType = 'text';
      let mediaUrl = null;

      console.log('Creating post with content:', content, 'User:', req.user!.id);

      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
        mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        console.log('Media uploaded:', mediaUrl, 'Type:', mediaType);
      }

      // Allow text-only posts, media-only posts, or both
      if (!content?.trim() && !req.file) {
        console.log('No content or media provided');
        return res.status(400).json({ message: "Post must have content or media" });
      }

      const post = await storage.createFeedPost({
        content: content?.trim() || null,
        authorId: req.user!.id,
        mediaType,
        mediaUrl,
      });

      console.log('Post created successfully:', post.id);
      res.status(201).json(post);
    } catch (error) {
      console.error('Post creation error:', error);
      res.status(500).json({ 
        message: "Failed to create post",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      const { content, parentCommentId } = req.body;
      const comment = await storage.addComment(req.params.postId, {
        content,
        authorId: req.user!.id,
        parentCommentId: parentCommentId || null,
      });
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/feed/:postId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { postId } = req.params;
      console.log('Fetching comments for post:', postId);

      const comments = await storage.getComments(postId);
      console.log('Found comments:', comments?.length || 0, 'for post:', postId);

      res.json(comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/user/likes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { postIds } = req.body;
      const userId = req.user!.id;

      const likedPosts = await storage.getUserLikes(userId, postIds);
      res.json(likedPosts);
    } catch (error) {
      console.error('Error fetching user likes:', error);
      res.status(500).json({ message: "Failed to fetch user likes" });
    }
  });

  // Profile endpoint with complete data
  app.get("/api/user/profile/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user!.id;

      // Get user profile data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get fans count (followers)
      const fansCount = await storage.getFansCount(userId);

      // Get following count
      const followingCount = await storage.getFollowingCount(userId);

      // Check if current user is friend with this user
      let isFriend = false;
      if (currentUserId !== userId) {
        isFriend = await storage.checkFollowStatus(currentUserId, userId);
      }

      const profileData = {
        id: user.id,
        username: user.username,
        level: user.level || 1,
        status: user.status || "",
        bio: user.bio || "",
        isOnline: user.isOnline || false,
        country: user.country || "ID",
        profilePhotoUrl: user.profilePhotoUrl,
        fansCount: fansCount || 0,
        followingCount: followingCount || 0,
        isFriend
      };

      res.json(profileData);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  // Follow/Unfollow endpoints
  app.post("/api/user/follow", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const followerId = req.user!.id;

      if (followerId === userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      // Check if already following
      const existingFollow = await storage.checkFollowStatus(followerId, userId);
      if (existingFollow) {
        return res.status(400).json({ message: "Already following this user" });
      }

      await storage.followUser(followerId, userId);
      res.json({ success: true, message: "Successfully followed user" });
    } catch (error) {
      console.error('Failed to follow user:', error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.post("/api/user/unfollow", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const followerId = req.user!.id;

      await storage.unfollowUser(followerId, userId);
      res.json({ success: true, message: "Successfully unfollowed user" });
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Credits transaction history endpoint
  app.get("/api/credits/history", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const transactions = await storage.getCreditTransactionHistory(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to fetch transaction history:", error);
      res.status(500).json({ message: "Failed to fetch transaction history" });
    }
  });

  // Credits transfer endpoint
  app.post("/api/credits/transfer", requireAuth, async (req, res) => {
    try {
      const { recipientUsername, amount, pin } = req.body;
      const senderId = req.user!.id;

      if (!recipientUsername || !amount || !pin) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }

      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }

      // Get sender
      const sender = await storage.getUser(senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }

      // Check sender balance
      if ((sender.coins || 0) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Find recipient by username
      const recipient = await storage.getUserByUsername(recipientUsername);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (sender.id === recipient.id) {
        return res.status(400).json({ message: "Cannot transfer to yourself" });
      }

      // TODO: Validate PIN against user's stored PIN
      // For now, we'll accept any 6-digit PIN

      // Perform transfer
      await storage.transferCoins(senderId, recipient.id, amount);

      res.json({
        success: true,
        message: `Successfully transferred ${amount} coins to ${recipientUsername}`,
      });
    } catch (error) {
      console.error("Failed to transfer credits:", error);
      res.status(500).json({ message: "Failed to transfer credits" });
    }
  });

  // Mentor routes
  app.get('/api/mentors', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const mentors = await storage.getMentors();
      res.json(mentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      res.status(500).json({ message: 'Failed to fetch mentors' });
    }
  });

  app.post('/api/mentor/register', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
      const { specialty } = req.body;
      const updatedUser = await storage.updateUserMentorStatus(req.user.id, true, specialty);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error registering as mentor:', error);
      res.status(500).json({ message: 'Failed to register as mentor' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await db.select().from(users);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/admin/promote', requireAdmin, async (req, res) => {
    try {
      const { userId, role } = req.body;

      if (role === 'admin') {
        const updatedUser = await storage.updateUserAdminStatus(userId, true);
        res.json(updatedUser);
      } else if (role === 'mentor') {
        const updatedUser = await storage.updateUserMentorStatus(userId, true);
        res.json(updatedUser);
      } else {
        res.status(400).json({ message: 'Invalid role' });
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      res.status(500).json({ message: 'Failed to promote user' });
    }
  });

  app.post('/api/admin/demote', requireAdmin, async (req, res) => {
    try {
      const { userId, role } = req.body;

      if (role === 'admin') {
        const updatedUser = await storage.updateUserAdminStatus(userId, false);
        res.json(updatedUser);
      } else if (role === 'mentor') {
        const updatedUser = await storage.updateUserMentorStatus(userId, false);
        res.json(updatedUser);
      } else {
        res.status(400).json({ message: 'Invalid role' });
      }
    } catch (error) {
      console.error('Error demoting user:', error);
      res.status(500).json({ message: 'Failed to demote user' });
    }
  });

  app.get('/api/admin/users/search', requireAdmin, async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
      }

      const searchQuery = `%${q.trim().toLowerCase()}%`;
      
      const searchResults = await db.select()
        .from(users)
        .where(
          or(
            sql`LOWER(${users.username}) LIKE ${searchQuery}`,
            sql`LOWER(${users.email}) LIKE ${searchQuery}`
          )
        )
        .limit(50);

      res.json(searchResults);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  app.post('/api/admin/ban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Prevent admin from banning themselves
      if (userId === req.user?.id) {
        return res.status(400).json({ message: 'Cannot ban yourself' });
      }

      const updatedUser = await storage.banUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  app.post('/api/admin/unban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const updatedUser = await storage.unbanUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ message: 'Failed to unban user' });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const onlineUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isOnline, true));
      const totalMentors = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isMentor, true));
      const totalAdmins = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, true));
      const bannedUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isBanned, true));

      res.json({
        totalUsers: totalUsers[0]?.count || 0,
        onlineUsers: onlineUsers[0]?.count || 0,
        totalMentors: totalMentors[0]?.count || 0,
        totalAdmins: totalAdmins[0]?.count || 0,
        bannedUsers: bannedUsers[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
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
              // Check if user is banned from rooms
              const currentUser = await storage.getUser(userId);
              if (currentUser?.isBanned) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'You are banned from accessing chat rooms',
                }));
                break;
              }

              // Prevent duplicate joins - check if user is already in the room
              if (currentRoomId === message.roomId) {
                console.log(`User ${userId} already in room ${message.roomId}, skipping duplicate join`);
                break;
              }

              // Check room capacity (25 users max)
              const roomMemberCount = await getRoomMemberCount(message.roomId);
              if (roomMemberCount >= 25) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Room is full (maximum 25 users)',
                }));
                break;
              }

              // Get user data first
              const currentUser = await storage.getUser(userId);
              if (!currentUser) {
                return; // Should not happen if userId is valid
              }

              // Check if user is already in this specific room to prevent duplicates
              let userAlreadyInRoom = false;

              // For mock rooms (1-4), track in memory with user data
              if (['1', '2', '3', '4'].includes(message.roomId)) {
                if (!mockRoomMembers.has(message.roomId)) {
                  mockRoomMembers.set(message.roomId, new Map());
                }

                // Check if user already exists in room
                userAlreadyInRoom = mockRoomMembers.get(message.roomId)!.has(userId);

                if (!userAlreadyInRoom) {
                  mockRoomMembers.get(message.roomId)!.set(userId, {
                    id: userId,
                    username: currentUser.username || 'User',
                    level: currentUser.level || 1,
                    isOnline: true,
                    profilePhotoUrl: currentUser.profilePhotoUrl || null // Include profilePhotoUrl
                  });
                  currentRoomId = message.roomId;

                  console.log(`User ${currentUser.username} joined room ${message.roomId}. Total members:`, mockRoomMembers.get(message.roomId)!.size);
                }
              } else {
                // For real rooms, check membership first
                const existingMembers = await storage.getRoomMembers(message.roomId);
                userAlreadyInRoom = existingMembers?.some(member => member.user.id === userId) || false;

                if (!userAlreadyInRoom) {
                  await storage.joinRoom(message.roomId, userId);
                  currentRoomId = message.roomId;
                }
              }

              // Only send messages if user wasn't already in room
              if (!userAlreadyInRoom) {
                // Get room name for welcome message
                const roomNames = {
                  '1': 'MeChat',
                  '2': 'Indonesia', 
                  '3': 'MeChat',
                  '4': 'lowcard'
                };
                const roomName = roomNames[message.roomId as keyof typeof roomNames] || 'room';

                // Broadcast system message about user joining (no welcome message to avoid spam)
                broadcastToRoom(message.roomId, {
                  type: 'new_message',
                  message: {
                    id: `system-join-${userId}-${Date.now()}`,
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

                // Broadcast room count update to all clients
                const currentCount = await getRoomMemberCount(message.roomId);
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'room_member_count_updated',
                      roomId: message.roomId,
                      memberCount: currentCount
                    }));
                  }
                });
              } else {
                console.log(`User ${currentUser.username} already in room ${message.roomId}, no duplicate join message sent`);
              }
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

              // Broadcast room count update to all clients
              const currentCount = await getRoomMemberCount(message.roomId);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'room_member_count_updated',
                    roomId: message.roomId,
                    memberCount: currentCount
                  }));
                }
              });
            }
            break;

          case 'send_message':
            if (userId && message.content) {
              // Check if user is banned from rooms (only for room messages)
              if (message.roomId) {
                const currentUser = await storage.getUser(userId);
                if (currentUser?.isBanned) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'You are banned from sending messages in chat rooms',
                  }));
                  break;
                }
              }

              if (message.roomId) {
                // Check if message is a whois command
                const whoisCommandRegex = /^\/whois\s+(.+)$/i;
                const whoisMatch = message.content.match(whoisCommandRegex);

                if (whoisMatch) {
                  const [, targetUsername] = whoisMatch;

                  // Find user in current room
                  let targetUser = null;

                  if (['1', '2', '3', '4'].includes(message.roomId)) {
                    // Search in mock room members
                    const roomMembers = mockRoomMembers.get(message.roomId);
                    if (roomMembers) {
                      for (const [memberId, memberData] of roomMembers) {
                        if (memberData.username.toLowerCase() === targetUsername.toLowerCase()) {
                          targetUser = memberData;
                          break;
                        }
                      }
                    }
                  } else {
                    // Search in real room members
                    const roomMembers = await storage.getRoomMembers(message.roomId);
                    targetUser = roomMembers?.find(member => 
                      member.user.username.toLowerCase() === targetUsername.toLowerCase()
                    )?.user;
                  }

                  if (targetUser) {
                    // Format creation date
                    const createdAt = targetUser.createdAt ? new Date(targetUser.createdAt) : null;
                    const formattedDate = createdAt ? 
                      `${createdAt.getDate().toString().padStart(2, '0')}/${(createdAt.getMonth() + 1).toString().padStart(2, '0')}/${createdAt.getFullYear()}` : 
                      'Unknown';

                    // Send whois info only to the requesting user
                    const whoisInfo = {
                      id: `whois-${Date.now()}`,
                      content: `📋 User Info for ${targetUser.username}:\n` +
                               `• Level: ${targetUser.level}\n` +
                               `• Status: ${targetUser.isOnline ? 'Online' : 'Offline'}\n` +
                               `• Country: ${targetUser.country || 'Not specified'}\n` +
                               `• Account created: ${formattedDate}`,
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
                    };

                    // Send only to requesting user
                    ws.send(JSON.stringify({
                      type: 'new_message',
                      message: whoisInfo,
                    }));
                  } else {
                    // User not found
                    const notFoundMessage = {
                      id: `whois-error-${Date.now()}`,
                      content: `❌ User '${targetUsername}' not found in this room.`,
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
                    };

                    // Send only to requesting user
                    ws.send(JSON.stringify({
                      type: 'new_message',
                      message: notFoundMessage,
                    }));
                  }
                  break;
                }

                // Check if message is a /me command
                const meCommandRegex = /^\/me\s*(.*)$/i;
                const meMatch = message.content.match(meCommandRegex);

                if (meMatch) {
                  const [, actionText] = meMatch;
                  const user = await storage.getUser(userId);

                  // Create /me action message
                  const meActionContent = actionText.trim() ? 
                    `* ${user?.username || 'User'} ${actionText.trim()}` : 
                    `* ${user?.username || 'User'}`;

                  // For mock rooms (1-4), create a mock message
                  if (['1', '2', '3', '4'].includes(message.roomId)) {
                    const meMessage = {
                      id: `me-${Date.now()}`,
                      content: meActionContent,
                      senderId: userId,
                      roomId: message.roomId,
                      recipientId: null,
                      messageType: 'action',
                      metadata: { isAction: true },
                      createdAt: new Date().toISOString(),
                      sender: {
                        id: userId,
                        username: user?.username || 'User',
                        level: user?.level || 1,
                        isOnline: user?.isOnline || true,
                        profilePhotoUrl: user?.profilePhotoUrl || null
                      }
                    };

                    // Broadcast to room
                    broadcastToRoom(message.roomId, {
                      type: 'new_message',
                      message: meMessage,
                    });
                  } else {
                    // Real room message
                    const messageData = insertMessageSchema.parse({
                      content: meActionContent,
                      senderId: userId,
                      roomId: message.roomId,
                      recipientId: null,
                      messageType: 'action',
                      metadata: { isAction: true },
                    });

                    const newMessage = await storage.createMessage(messageData);

                    // Broadcast to room
                    broadcastToRoom(message.roomId, {
                      type: 'new_message',
                      message: newMessage,
                    });
                  }
                  break;
                }

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
                      profilePhotoUrl: user?.profilePhotoUrl || null // Include profilePhotoUrl
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

            // Broadcast room count update to all clients
            const currentCount = await getRoomMemberCount(currentRoomId);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'room_member_count_updated',
                  roomId: currentRoomId,
                  memberCount: currentCount
                }));
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