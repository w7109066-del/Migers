import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs"; // Import fs module
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChatRoomSchema, insertMessageSchema, insertFriendshipSchema, insertPostSchema, insertCommentSchema } from "@shared/schema";
import { eq, desc, and, or, sql, asc, isNull } from "drizzle-orm";
import { db } from "./db";
import { directMessages, users, messages, friendships, notifications, gifts } from "@shared/schema"; // Import gifts schema
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Mock data for gifts
let customGifts: any[] = [];

// Helper function to authenticate user, returns user object or null
async function authenticateUser(req: any): Promise<any | null> {
  return new Promise((resolve) => {
    if (req.isAuthenticated()) {
      resolve(req.user);
    } else {
      resolve(null);
    }
  });
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Check if user is suspended
  if (req.user?.isSuspended) {
    return res.status(403).json({ message: "Your account has been suspended. Please contact administrator." });
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

  // Check for temporary bans
  const tempBans = global.tempBans || new Map();
  const tempBan = tempBans.get(req.user.id);
  if (tempBan) {
    if (Date.now() < tempBan.expiration) {
      const remainingTime = Math.ceil((tempBan.expiration - Date.now()) / 1000 / 60);
      return res.status(403).json({
        message: `You are temporarily banned from rooms for ${remainingTime} more minutes due to being kicked by admin ${tempBan.kickedBy}`
      });
    } else {
      // Ban expired, remove it
      tempBans.delete(req.user.id);
    }
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
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  // Configure multer for gift files
  const giftStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = 'uploads/gifts/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const fileName = `gift-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      cb(null, fileName);
    }
  });

  const upload = multer({
    storage: multerStorage,
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

  const giftUpload = multer({
    storage: giftStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit for gift files
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // User profile update endpoint
  app.put("/api/user/profile", requireAuth, upload.single('profilePhoto'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { bio, country, phoneNumber } = req.body;

      let profilePhotoUrl = null;
      if (req.file) {
        profilePhotoUrl = `/uploads/${req.file.filename}`;
      }

      // Validate phone number format if provided
      if (phoneNumber && !/^\+\d{10,15}$/.test(phoneNumber)) {
        return res.status(400).json({
          message: 'Invalid phone number format. Use international format starting with +'
        });
      }

      // Update user profile in database
      await storage.updateUserProfile(userId, {
        bio: bio || null,
        country: country || null,
        phoneNumber: phoneNumber || null,
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
      console.log('=== ROOMS API ENDPOINT ===');
      console.log('User:', req.user?.username);

      // Return mock rooms data first (always works)
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

      let allRooms = [...mockRooms];

      try {
        // Try to get user-created rooms from database
        console.log('Fetching user-created rooms from database...');
        const userRooms = await storage.getAllRooms();
        console.log('User rooms fetched:', userRooms?.length || 0);

        if (userRooms && Array.isArray(userRooms)) {
          // Convert user rooms to the expected format
          const formattedUserRooms = userRooms.map(room => ({
            id: room.id,
            name: room.name || 'Unnamed Room',
            description: room.description || "",
            memberCount: 0,
            capacity: room.maxMembers || 25,
            isOfficial: false,
            category: "recent",
            isPrivate: !room.isPublic
          }));

          allRooms = [...mockRooms, ...formattedUserRooms];
          console.log('Total rooms (with user rooms):', allRooms.length);
        }
      } catch (dbError) {
        console.error('Database error fetching user rooms:', dbError);
        // Continue with just mock rooms if database fails
        console.log('Continuing with mock rooms only');
      }

      console.log('Returning rooms:', allRooms.length);
      res.json(allRooms);

    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      console.error("Error stack:", error.stack);
      
      // Return fallback mock rooms even on error
      const fallbackRooms = [
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
        }
      ];

      console.log('Returning fallback rooms due to error');
      res.json(fallbackRooms);
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

      // For mock rooms, return members from memory with deduplication
      if (['1', '2', '3', '4'].includes(roomId)) {
        if (mockRoomMembers.has(roomId)) {
          const roomMembersMap = mockRoomMembers.get(roomId)!;

          // Deduplicate members by username
          const uniqueMembers = new Map();

          for (const [memberId, userData] of roomMembersMap) {
            const username = userData.username;
            if (!uniqueMembers.has(username) || uniqueMembers.get(username).id === memberId) {
              uniqueMembers.set(username, userData);
            }
          }

          const members = Array.from(uniqueMembers.values()).map(userData => ({
            user: userData
          }));

          res.json(members);
        } else {
          res.json([]);
        }
      } else {
        // For real rooms, use storage with deduplication
        const allMembers = await storage.getRoomMembers(roomId);

        // Deduplicate by user ID
        const uniqueMembers = new Map();
        if (allMembers) {
          for (const member of allMembers) {
            if (!uniqueMembers.has(member.user.id)) {
              uniqueMembers.set(member.user.id, member);
            }
          }
        }

        res.json(Array.from(uniqueMembers.values()));
      }
    } catch (error) {
      console.error("Failed to fetch room members:", error);
      res.status(500).json({ message: "Failed to fetch room members" });
    }
  });

  // Admin report endpoint
  app.post('/api/admin/report', async (req, res) => {
    try {
      const { reportedUserId, reportedUsername, reporterUserId, reporterUsername, roomId, roomName, message } = req.body;

      // Send report message to admin room or log it
      console.log('User Report:', {
        reportedUserId,
        reportedUsername,
        reporterUserId,
        reporterUsername,
        roomId,
        roomName,
        message,
        timestamp: new Date().toISOString()
      });

      // TODO: Store report in database or send to admin chat

      res.json({ success: true, message: 'Report sent successfully' });
    } catch (error) {
      console.error('Failed to submit report:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });



  // Kick user from room endpoint
  app.post('/api/rooms/:roomId/kick', async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;
      const kickerUserId = req.user?.id;

      if (!kickerUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if kicker has permission (admin or room moderator)
      const kickerUser = await storage.getUser(kickerUserId); // Assuming getUserById exists
      if (!kickerUser || kickerUser.level < 1) { // Assuming level 1+ are admins who can kick
        return res.status(403).json({ error: 'Insufficient permissions to kick users' });
      }

      // Get user being kicked to check if they're admin
      const targetUser = await storage.getUser(userId);
      if (targetUser && targetUser.level >= 5) {
        return res.status(403).json({ error: 'Cannot kick admin users' });
      }

      // Add temporary ban for 5 minutes
      const banExpiration = Date.now() + (5 * 60 * 1000); // 5 minutes from now
      tempBans.set(userId, {
        expiration: banExpiration,
        kickedBy: kickerUser.username,
        roomId: roomId
      });

      // Remove user from room
      if (['1', '2', '3', '4'].includes(roomId)) {
        // Handle mock rooms
        const roomMembers = mockRoomMembers.get(roomId);
        if (roomMembers && roomMembers.has(userId)) {
          roomMembers.delete(userId);
        }
      } else {
        // Remove from real room
        await storage.removeUserFromRoom(roomId, userId); // Assuming removeUserFromRoom exists
      }

      // Get user info for notification
      const kickedUser = await storage.getUser(userId); // Assuming getUserById exists

      // Emit kick event to the user and room
      if (kickedUser) {
        io.to(roomId).emit('userKicked', {
          userId: userId,
          username: kickedUser.username,
          roomId: roomId,
          kickedBy: kickerUser.username
        });

        // Send kick notification message visible to all users in room
        const kickNotificationMessage = {
          id: `kick-notification-${Date.now()}-${userId}`,
          content: `${kickedUser.username} has been kicked by admin ${kickerUser.username} and temporarily banned for 5 minutes`,
          senderId: 'system',
          roomId: roomId,
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

        // Broadcast kick message to all users in the room
        io.to(roomId).emit('new_message', {
          message: kickNotificationMessage
        });

        // Force the kicked user to leave the room after a short delay
        setTimeout(async () => {
          const userSockets = await io.in(roomId).fetchSockets();
          for (const socket of userSockets) {
            // Ensure we only target the correct user's socket within the room
            if (socket.data.userId === userId) {
              socket.leave(roomId);
              socket.emit('forcedLeaveRoom', {
                roomId: roomId,
                reason: `You have been kicked by admin ${kickerUser.username} and temporarily cannot rejoin for 5 minutes`
              });
            }
          }
        }, 2000); // 2 second delay to allow user to see the kick message
      }

      res.json({ success: true, message: 'User kicked successfully' });
    } catch (error) {
      console.error('Failed to kick user:', error);
      res.status(500).json({ error: 'Failed to kick user' });
    }
  });

  // Get room info
  app.get("/api/rooms/:roomId/info", requireRoomAccess, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user!.id; // Authenticated user ID

    try {
      if (['1', '2', '3', '4'].includes(roomId)) {
        // Mock room info
        const roomNames: { [key: string]: string } = {
          '1': 'MeChat',
          '2': 'Indonesia',
          '3': 'MeChat',
          '4': 'lowcard'
        };
        const roomDescriptions: { [key: string]: string } = {
          '1': 'Official main chat room',
          '2': 'Chat for Indonesian users',
          '3': 'Your favorite chat room',
          '4': 'Card game room'
        };

        res.json({
          id: roomId,
          name: roomNames[roomId as keyof typeof roomNames],
          description: roomDescriptions[roomId as keyof typeof roomDescriptions],
          createdBy: 'System',
          createdAt: '2024-01-01T00:00:00Z', // Mock creation date
          capacity: 25, // Default capacity
          isPrivate: false // Default for mock rooms
        });
      } else {
        // Real room info
        const room = await storage.getChatRoom(roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        // Get creator username
        let createdBy = 'Unknown';
        if (room.createdBy) {
          try {
            const creator = await storage.getUser(room.createdBy);
            createdBy = creator?.username || 'Unknown';
          } catch (error) {
            console.error('Failed to get creator info:', error);
          }
        }

        // Ensure response matches expected structure
        res.json({
          id: room.id,
          name: room.name,
          description: room.description || "",
          createdBy: createdBy,
          createdAt: room.createdAt ? room.createdAt.toISOString() : new Date().toISOString(),
          capacity: room.maxMembers || 25,
          isPrivate: !room.isPublic
        });
      }
    } catch (error) {
      console.error("Error getting room info:", error);
      res.status(500).json({ message: "Failed to get room info" });
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

      console.log('Credit transfer attempt:', {
        senderId,
        recipientUsername,
        amount,
        hasPin: !!pin
      });

      if (!recipientUsername || !amount || !pin) {
        console.log('Missing required fields:', { recipientUsername: !!recipientUsername, amount: !!amount, pin: !!pin });
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      if (amount <= 0) {
        console.log('Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0"
        });
      }

      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        console.log('Invalid PIN format');
        return res.status(400).json({
          success: false,
          message: "PIN must be exactly 6 digits"
        });
      }

      // Get sender
      const sender = await storage.getUser(senderId);
      if (!sender) {
        console.log('Sender not found:', senderId);
        return res.status(404).json({
          success: false,
          message: "Sender not found"
        });
      }

      console.log('Sender balance:', sender.coins);

      // Level restriction removed - all users can transfer credits

      // Check sender balance
      if ((sender.coins || 0) < amount) {
        console.log('Insufficient balance:', { senderCoins: sender.coins, requestedAmount: amount });
        return res.status(400).json({
          success: false,
          message: "Insufficient balance"
        });
      }

      // Find recipient by username
      const recipient = await storage.getUserByUsername(recipientUsername);
      if (!recipient) {
        console.log('Recipient not found:', recipientUsername);
        return res.status(404).json({
          success: false,
          message: "Recipient not found"
        });
      }

      if (sender.id === recipient.id) {
        console.log('User trying to transfer to themselves');
        return res.status(400).json({
          success: false,
          message: "Cannot transfer to yourself"
        });
      }

      console.log('Transfer validation passed, performing transfer...');

      // TODO: Validate PIN against user's stored PIN
      // For now, we'll accept any 6-digit PIN

      // Perform transfer
      await storage.transferCoins(senderId, recipient.id, amount);

      try {
        // Create notification for recipient
        const notification = await storage.createNotification({
          userId: recipient.id,
          type: 'credit_transfer',
          title: 'Credits Received',
          message: `You received ${amount} coins from ${sender.username}`,
          fromUserId: senderId,
          data: { amount, senderUsername: sender.username }
        });

        console.log('Notification created successfully:', notification);

        // Send real-time notification via WebSocket
        if (notification) {
          broadcastToUser(recipient.id, {
            type: 'new_notification',
            notification: {
              id: notification.id,
              type: 'credit_transfer',
              title: 'Credits Received',
              message: `You received ${amount} coins from ${sender.username}`,
              fromUser: {
                id: senderId,
                username: sender.username
              },
              data: { amount, senderUsername: sender.username },
              isRead: false,
              createdAt: notification.createdAt || new Date().toISOString()
            }
          });

          console.log('WebSocket notification sent to user:', recipient.id);
        }
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the transfer if notification creation fails
      }

      res.status(200).json({
        success: true,
        message: `Successfully transferred ${amount} coins to ${recipientUsername}`,
      });
    } catch (error) {
      console.error("Failed to transfer credits:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to transfer credits"
      });
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

  // User search endpoint
  app.get("/api/users/search", requireAuth, async (req, res) => {
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

      // Filter out suspended users from search results
      const filteredResults = searchResults.filter(user => !user.isSuspended);

      res.json(filteredResults.map(user => ({
        id: user.id,
        username: user.username,
        level: user.level || 1,
        isOnline: user.isOnline || false,
        country: user.country || "ID"
      })));
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  });

  // Admin-specific user search endpoint with complete data
  app.get("/api/admin/users/search", requireAdmin, async (req, res) => {
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

      // Return complete user data for admin
      res.json(searchResults.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level || 1,
        isOnline: user.isOnline || false,
        isMentor: user.isMentor || false,
        isAdmin: user.isAdmin || false,
        isBanned: user.isBanned || false,
        isSuspended: user.isSuspended || false,
        profilePhotoUrl: user.profilePhotoUrl,
        createdAt: user.createdAt || new Date().toISOString(),
        country: user.country || "ID"
      })));
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

      // Prevent banning admin users
      const targetUser = await storage.getUser(userId);
      if (targetUser && targetUser.level >= 5) {
        return res.status(403).json({ message: 'Cannot ban admin users' });
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

  app.post('/api/admin/suspend', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Prevent admin from suspending themselves
      if (userId === req.user?.id) {
        return res.status(400).json({ message: 'Cannot suspend yourself' });
      }

      const updatedUser = await storage.suspendUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  app.post('/api/admin/unsuspend', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const updatedUser = await storage.unsuspendUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error unsuspending user:', error);
      res.status(500).json({ message: 'Failed to unsuspend user' });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const onlineUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isOnline, true));
      const totalMentors = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isMentor, true));
      const totalAdmins = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, true));
      const bannedUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isBanned, true));
      const suspendedUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isSuspended, true));

      res.json({
        totalUsers: totalUsers[0]?.count || 0,
        onlineUsers: onlineUsers[0]?.count || 0,
        totalMentors: totalMentors[0]?.count || 0,
        totalAdmins: totalAdmins[0]?.count || 0,
        bannedUsers: bannedUsers[0]?.count || 0,
        suspendedUsers: suspendedUsers[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Get all chat rooms for admin
  app.get('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  // Create room via admin panel
  app.post('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
      const { name, description, maxMembers = 25, creatorUsername, isPublic = true } = req.body;

      if (!name || !description || !creatorUsername) {
        return res.status(400).json({ message: 'Name, description, and creator username are required' });
      }

      // Find the creator user by username
      const creator = await storage.getUserByUsername(creatorUsername);
      if (!creator) {
        return res.status(404).json({ message: 'Creator user not found' });
      }

      // Validate room name length
      if (name.length > 50) {
        return res.status(400).json({ message: 'Room name must be 50 characters or less' });
      }

      // Validate description length
      if (description.length > 200) {
        return res.status(400).json({ message: 'Description must be 200 characters or less' });
      }

      const roomData = insertChatRoomSchema.parse({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        maxMembers
      });

      const newRoom = await storage.createRoom(roomData, creator.id);
      res.status(201).json(newRoom);
    } catch (error) {
      console.error('Failed to create room via admin:', error);
      res.status(500).json({ message: 'Failed to create room' });
    }
  });

  // Delete chat room
  app.delete('/api/admin/rooms/:roomId', requireAdmin, async (req, res) => {
    try {
      const { roomId } = req.params;

      if (!roomId) {
        return res.status(400).json({ message: 'Room ID is required' });
      }

      // Prevent deletion of system rooms
      if (['1', '2', '3', '4'].includes(roomId)) {
        return res.status(403).json({ message: 'Cannot delete system rooms' });
      }

      // Get room info before deletion
      const room = await storage.getChatRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Delete the room and all associated data
      await storage.deleteRoom(roomId);

      // Broadcast room deletion to all connected users
      io.emit('room_deleted', {
        roomId: roomId,
        roomName: room.name
      });

      res.json({ 
        success: true, 
        message: `Room "${room.name}" has been deleted successfully` 
      });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ message: 'Failed to delete room' });
    }
  });

  // Friend request endpoints
  app.post('/api/friends/request', requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const requesterId = req.user!.id;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      if (requesterId === userId) {
        return res.status(400).json({ message: 'Cannot send friend request to yourself' });
      }

      // Check if friend request already exists
      const existingFriendship = await storage.getFriendshipStatus(requesterId, userId);
      if (existingFriendship) {
        return res.status(400).json({ message: 'Friend request already exists or you are already friends' });
      }

      // Get requester and recipient info
      const requester = await storage.getUser(requesterId);
      const recipient = await storage.getUser(userId);

      if (!requester || !recipient) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create friend request
      await storage.createFriendRequest(requesterId, userId);

      // Create notification for recipient
      try {
        const notification = await storage.createNotification({
          userId: userId,
          type: 'friend_request_received',
          title: 'New Friend Request',
          message: `${requester.username} sent you a friend request`,
          fromUserId: requesterId,
          data: { requesterId, requesterUsername: requester.username }
        });

        console.log('Friend request notification created:', notification);

        // Send real-time notification via WebSocket
        if (notification) {
          broadcastToUser(userId, {
            type: 'new_notification',
            notification: {
              id: notification.id,
              type: 'friend_request_received',
              title: 'New Friend Request',
              message: `${requester.username} sent you a friend request`,
              fromUser: {
                id: requesterId,
                username: requester.username
              },
              data: { requesterId, requesterUsername: requester.username },
              isRead: false,
              actionRequired: true,
              createdAt: notification.createdAt || new Date().toISOString()
            }
          });

          console.log('WebSocket friend request notification sent to user:', userId);
        }
      } catch (notificationError) {
        console.error('Failed to create friend request notification:', notificationError);
        // Don't fail the friend request if notification creation fails
      }

      res.json({ success: true, message: 'Friend request sent successfully' });
    } catch (error) {
      console.error('Failed to send friend request:', error);
      res.status(500).json({ message: 'Failed to send friend request' });
    }
  });

  // Check friend status
  app.get('/api/friends/status', requireAuth, async (req, res) => {
    try {
      const { userId } = req.query;
      const currentUserId = req.user!.id;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const friendship = await storage.getFriendshipStatus(currentUserId, userId);
      const isFriend = friendship?.status === 'accepted';

      res.json({ isFriend });
    } catch (error) {
      console.error('Failed to check friend status:', error);
      res.status(500).json({ message: 'Failed to check friend status' });
    }
  });

  // Get friends endpoint
  app.get('/api/friends', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      console.log(`=== API: Getting friends for user ${userId} ===`);

      const friends = await storage.getFriends(userId);
      console.log(`=== API: Returning ${friends.length} friends ===`);

      res.json(friends);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      res.status(500).json({ message: 'Failed to fetch friends' });
    }
  });

  // Force refresh friends endpoint
  app.post('/api/friends/refresh', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      console.log(`=== API: Force refreshing friends for user ${userId} ===`);

      const friends = await storage.refreshFriendsList(userId);
      console.log(`=== API: Force refresh returned ${friends.length} friends ===`);

      res.json(friends);
    } catch (error) {
      console.error('Failed to refresh friends:', error);
      res.status(500).json({ message: 'Failed to refresh friends' });
    }
  });

  // Accept friend request
  app.post('/api/friends/accept', requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const currentUserId = req.user!.id;

      console.log(`=== ACCEPT FRIEND REQUEST DEBUG ===`);
      console.log(`Request body:`, req.body);
      console.log(`Current user ID: ${currentUserId}`);
      console.log(`Friend request from user ID: ${userId}`);

      if (!userId) {
        console.log(`ERROR: Missing userId in request`);
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Check if users exist
      const currentUser = await storage.getUser(currentUserId);
      const friendUser = await storage.getUser(userId);

      if (!currentUser) {
        console.log(`ERROR: Current user not found: ${currentUserId}`);
        return res.status(404).json({
          success: false,
          message: 'Current user not found'
        });
      }

      if (!friendUser) {
        console.log(`ERROR: Friend user not found: ${userId}`);
        return res.status(404).json({
          success: false,
          message: 'Friend user not found'
        });
      }

      console.log(`Users found - Current: ${currentUser.username}, Friend: ${friendUser.username}`);

      // Check if friend request exists in any direction
      let existingFriendship = await storage.getFriendshipStatus(userId, currentUserId);

      // If not found, also check the reverse direction more explicitly
      if (!existingFriendship) {
        existingFriendship = await storage.getFriendshipStatus(currentUserId, userId);
      }

      console.log(`Final friendship check result:`, existingFriendship);

      if (!existingFriendship) {
        console.log(`No friendship record found in either direction`);

        // Check if there's a notification for this friend request
        const notification = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, currentUserId),
              eq(notifications.fromUserId, userId),
              eq(notifications.type, 'friend_request_received'),
              eq(notifications.isRead, false)
            )
          )
          .limit(1);

        if (notification.length > 0) {
          console.log(`Found notification but no friendship record - attempting to create missing friendship`);

          // Create the missing friendship record
          try {
            const newFriendship = await storage.createFriendRequest(userId, currentUserId);
            console.log(`Created missing friendship record:`, newFriendship);
            existingFriendship = newFriendship;
          } catch (createError) {
            console.error(`Failed to create missing friendship:`, createError);
          }
        }

        if (!existingFriendship) {
          return res.status(400).json({
            success: false,
            message: 'No friend request found between these users. The request may have expired or been deleted.'
          });
        }
      }

      if (existingFriendship.status !== 'pending') {
        console.log(`Friendship exists but status is: ${existingFriendship.status}, not pending`);

        if (existingFriendship.status === 'accepted') {
          return res.status(400).json({
            success: false,
            message: 'You are already friends with this user'
          });
        }

        return res.status(400).json({
          success: false,
          message: `Friend request is ${existingFriendship.status}, cannot accept`
        });
      }

      console.log(`Valid pending friend request found, proceeding with acceptance...`);

      // Accept the friend request in friendships table
      try {
        await storage.acceptFriendRequest(currentUserId, userId);
        console.log(`Successfully updated friendship status to accepted`);
      } catch (acceptError) {
        console.error(`ERROR accepting friend request in storage:`, acceptError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update friendship status',
          error: acceptError instanceof Error ? acceptError.message : 'Unknown error'
        });
      }

      // Friends table insertion is now handled in storage.acceptFriendRequest()
      console.log(`Friends table entries will be handled by storage layer`);

      // Send friend_list_updated via WebSocket to both users
      try {
        console.log(`Broadcasting friend_list_updated to both users...`);

        broadcastToUser(currentUserId, {
          type: 'friend_list_updated'
        });

        broadcastToUser(userId, {
          type: 'friend_list_updated'
        });

        console.log(`Successfully sent friend_list_updated to both users`);
      } catch (websocketError) {
        console.error('Error sending WebSocket update for friend list:', websocketError);
      }

      // Create acceptance notification for the requester
      try {
        console.log(`Creating acceptance notification for ${userId}...`);

        const notification = await storage.createNotification({
          userId: userId,
          type: 'friend_request_accepted',
          title: 'Friend Request Accepted',
          message: `${currentUser.username} accepted your friend request`,
          fromUserId: currentUserId,
          data: { acceptedBy: currentUserId, acceptedByUsername: currentUser.username }
        });

        console.log(`Notification created:`, notification);

        // Send real-time notification to the requester
        if (notification) {
          broadcastToUser(userId, {
            type: 'new_notification',
            notification: {
              id: notification.id,
              type: 'friend_request_accepted',
              title: 'Friend Request Accepted',
              message: `${currentUser.username} accepted your friend request`,
              fromUser: {
                id: currentUserId,
                username: currentUser.username
              },
              data: { acceptedBy: currentUserId, acceptedByUsername: currentUser.username },
              isRead: false,
              createdAt: notification.createdAt || new Date().toISOString()
            }
          });
          console.log(`Acceptance notification sent via WebSocket`);
        }
      } catch (notificationError) {
        console.error('Failed to create acceptance notification:', notificationError);
        // Don't fail the request if notification fails
      }

      // Clean up related friend request notifications
      try {
        console.log(`Cleaning up friend request notifications...`);

        // Mark friend request notifications as read for both users
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              or(
                and(
                  eq(notifications.userId, currentUserId),
                  eq(notifications.fromUserId, userId),
                  eq(notifications.type, 'friend_request_received')
                ),
                and(
                  eq(notifications.userId, userId),
                  eq(notifications.fromUserId, currentUserId),
                  eq(notifications.type, 'friend_request')
                )
              )
            )
          );

        console.log(`Friend request notifications cleaned up`);
      } catch (cleanupError) {
        console.error('Failed to cleanup friend request notifications:', cleanupError);
        // Don't fail the request if cleanup fails
      }

      console.log(`=== FRIEND REQUEST ACCEPTED SUCCESSFULLY ===`);
      console.log(`${friendUser.username} (${userId}) accepted by ${currentUser.username} (${currentUserId})`);

      res.json({
        success: true,
        message: 'Friend request accepted successfully',
        data: {
          friendId: userId,
          friendUsername: friendUser.username
        }
      });

    } catch (error) {
      console.error('=== FATAL ERROR IN ACCEPT FRIEND REQUEST ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      res.status(500).json({
        success: false,
        message: 'Failed to accept friend request',
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : 'No stack trace'
        } : undefined
      });
    }
  });

  // Reject friend request
  app.post('/api/friends/reject', requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const currentUserId = req.user!.id;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      await storage.rejectFriendRequest(currentUserId, userId);

      res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      res.status(500).json({ message: 'Failed to reject friend request' });
    }
  });

  // Unfriend/remove friend
  app.post('/api/friends/unfriend', requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const currentUserId = req.user!.id;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Remove the friendship
      await storage.rejectFriendRequest(currentUserId, userId);
      await storage.rejectFriendRequest(userId, currentUserId);

      // Send friend_list_updated via WebSocket to both users
      try {
        const senderSocket = userConnections.get(currentUserId)?.socket;
        const receiverSocket = userConnections.get(userId)?.socket;

        if (senderSocket) {
          senderSocket.send(JSON.stringify({
            type: 'friend_list_updated'
          }));
        }

        if (receiverSocket) {
          receiverSocket.send(JSON.stringify({
            type: 'friend_list_updated'
          }));
        }
      } catch (websocketError) {
        console.error('Error sending WebSocket update for unfriend:', websocketError);
      }

      res.json({ success: true, message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Failed to unfriend user:', error);
      res.status(500).json({ message: 'Failed to unfriend user' });
    }
  });

  // Send OTP via WhatsApp (placeholder - you'll need to integrate with WhatsApp API)
  app.post('/api/user/send-otp', requireAuth, async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      const userId = req.user!.id;

      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      // Get current user to check registered phone number
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if phone number matches user's registered number
      if (currentUser.phoneNumber && currentUser.phoneNumber !== phoneNumber) {
        return res.status(400).json({
          message: 'You can only send OTP to your registered phone number. Please update your profile first.'
        });
      }

      // If user doesn't have a phone number registered, require them to register it first
      if (!currentUser.phoneNumber) {
        return res.status(400).json({
          message: 'Please register your phone number in your profile first before requesting OTP.'
        });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in memory (in production, use Redis or database with expiration)
      const otpStore = global.otpStore || (global.otpStore = new Map());
      otpStore.set(phoneNumber, {
        code: otpCode,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0
      });

      // TODO: Integrate with WhatsApp API to send OTP
      // For now, we'll just log it (in production, remove this)
      console.log(`OTP for ${phoneNumber}: ${otpCode}`);

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  });

  // Verify OTP
  app.post('/api/user/verify-otp', requireAuth, async (req, res) => {
    try {
      const { phoneNumber, otpCode } = req.body;

      if (!phoneNumber || !otpCode) {
        return res.status(400).json({ message: 'Phone number and OTP code are required' });
      }

      const otpStore = global.otpStore || new Map();
      const otpData = otpStore.get(phoneNumber);

      if (!otpData) {
        return res.status(400).json({ message: 'No OTP found for this phone number' });
      }

      if (Date.now() > otpData.expires) {
        otpStore.delete(phoneNumber);
        return res.status(400).json({ message: 'OTP has expired' });
      }

      if (otpData.attempts >= 3) {
        otpStore.delete(phoneNumber);
        return res.status(400).json({ message: 'Too many attempts. Please request a new OTP' });
      }

      if (otpData.code !== otpCode) {
        otpData.attempts++;
        return res.status(400).json({ message: 'Invalid OTP code' });
      }

      // Mark as verified
      otpData.verified = true;

      res.json({ message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  });

  // Change password
  app.post('/api/user/change-password', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { oldPassword, newPassword, phoneNumber, otpCode } = req.body;

      if (!oldPassword || !newPassword || !phoneNumber || !otpCode) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Verify OTP is still valid and verified
      const otpStore = global.otpStore || new Map();
      const otpData = otpStore.get(phoneNumber);

      if (!otpData || !otpData.verified || Date.now() > otpData.expires) {
        return res.status(400).json({ message: 'Invalid or expired OTP verification' });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify old password (placeholder - implement actual password verification)
      // In production, you should hash and compare passwords properly
      if (user.password && user.password !== oldPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password (placeholder - implement actual password hashing)
      // In production, hash the password before storing
      await storage.updateUserPassword(userId, newPassword);

      // Clean up OTP
      otpStore.delete(phoneNumber);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Get user notifications
  app.get('/api/notifications', requireAuth, async (req, res) => {
    const userId = req.user!.id;

    // Fetch notifications for the user
    try {
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  // Send a direct message
  app.post('/api/messages/send', requireAuth, async (req, res) => {
    try {
      const { recipientId, content, messageType = 'text' } = req.body;

      if (!recipientId || !content) {
        return res.status(400).json({ error: 'Recipient ID and content are required' });
      }

      const message = await storage.sendDirectMessage(req.user!.id, recipientId, content, messageType);
      res.json(message);
    } catch (error) {
      console.error('Error sending direct message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Get direct messages with a specific user
  app.get('/api/messages/direct/:recipientId', requireAuth, async (req, res) => {
    try {
      const { recipientId } = req.params;
      const currentUserId = req.user!.id;

      console.log(`Loading direct messages between ${currentUserId} and ${recipientId}`);

      const messages = await storage.getDirectMessages(currentUserId, recipientId);

      console.log(`Found ${messages.length} direct messages`);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({
        error: 'Failed to fetch direct messages',
        message: error instanceof Error ? error.message : 'Unknown error',
        messages: []
      });
    }
  });

  // Send direct messages endpoint
  app.post('/api/messages/direct', requireAuth, upload.single('media'), async (req, res) => {
    try {
      const { content, recipientId, messageType = 'text', giftData } = req.body;
      const senderId = req.user!.id;

      if (!recipientId) {
        return res.status(400).json({ error: 'Recipient ID is required' });
      }

      if (!content && !req.file) {
        return res.status(400).json({ error: 'Message content or media is required' });
      }

      let messageContent = content || '';
      let finalMessageType = messageType;
      let metadata = null;

      // Handle media upload
      if (req.file) {
        const mediaUrl = `/uploads/${req.file.filename}`;
        finalMessageType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';

        if (content) {
          messageContent = `${content}\n${mediaUrl}`;
        } else {
          messageContent = mediaUrl;
        }

        metadata = {
          mediaUrl,
          mediaType: finalMessageType,
          originalFilename: req.file.originalname
        };
      }

      // Handle gift messages
      if (giftData) {
        finalMessageType = 'gift';
        metadata = { giftData };
      }

      const directMessage = await storage.createDirectMessage({
        content: messageContent,
        senderId,
        recipientId,
        messageType: finalMessageType
      });

      // Add metadata to the message if present
      if (metadata) {
        directMessage.metadata = metadata;
        if (giftData) {
          directMessage.giftData = giftData;
        }
      }

      console.log(`Direct message sent from ${senderId} to ${recipientId}`);

      // Broadcast to recipient via WebSocket
      broadcastToUser(recipientId, {
        type: 'new_direct_message',
        message: directMessage,
      });

      res.json(directMessage);
    } catch (error) {
      console.error('Error sending direct message:', error);
      res.status(500).json({
        error: 'Failed to send direct message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user's direct message conversations
  app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
      console.log('=== CONVERSATIONS API ENDPOINT ===');
      console.log('User:', req.user?.username);
      console.log('User ID:', req.user?.id);

      // Check if storage has the method
      if (typeof storage.getDirectMessageConversations !== 'function') {
        console.error('storage.getDirectMessageConversations is not a function');
        return res.status(500).json({
          error: 'Failed to fetch conversations',
          message: 'getDirectMessageConversations method not available',
          conversations: []
        });
      }

      const conversations = await storage.getDirectMessageConversations(req.user!.id);
      console.log('Conversations fetched:', conversations?.length || 0);

      // Ensure we always return a valid JSON array
      if (!Array.isArray(conversations)) {
        console.warn('Conversations is not an array, returning empty array');
        return res.json([]);
      }

      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      console.error('Error stack:', error.stack);
      // Always return JSON, never HTML error pages
      res.status(500).json({
        error: 'Failed to fetch conversations',
        message: error instanceof Error ? error.message : 'Unknown error',
        conversations: [] // Provide fallback empty array
      });
    }
  });

  // Admin: Get all custom gifts
  app.get('/api/admin/gifts', requireAdmin, async (req, res) => {
    try {
      // Return empty array for now to prevent errors
      res.json([]);
    } catch (error) {
      console.error('Error fetching gifts:', error);
      res.status(500).json({ error: 'Failed to fetch gifts' });
    }
  });

  // Admin: Add new gift with file upload
  app.post('/api/admin/gifts/add', requireAdmin, giftUpload.fields([
    { name: 'pngFile', maxCount: 1 },
    { name: 'jsonFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { name, emoji, price, category } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!name || !emoji || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // For now, just return success without database operation
      res.json({ success: true, message: 'Gift added successfully' });
    } catch (error) {
      console.error('Error adding gift:', error);
      res.status(500).json({ error: 'Failed to add gift' });
    }
  });

  // Admin: Delete gift
  app.delete('/api/admin/gifts/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // For now, just return success
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting gift:', error);
      res.status(500).json({ error: 'Failed to delete gift' });
    }
  });

  // Serve gift images
  app.get('/api/gifts/image/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join('uploads/gifts', filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ message: 'Image not found' });
    }
  });


  const httpServer = createServer(app);

  // Socket.IO server for real-time features
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: "/socket.io/",
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Track users in mock rooms with detailed user info
  const mockRoomMembers = new Map<string, Map<string, any>>();

  // Track user connections and their current rooms
  const userConnections = new Map<string, { socket: any; currentRoomId: string | null }>();

  // Access temp bans from global scope
  const tempBans = global.tempBans || new Map();

  // Periodic cleanup for stale connections (every 5 minutes)
  setInterval(() => {
    try {
      console.log(`Cleaning up stale connections. Current active connections: ${userConnections.size}`);
      
      const now = Date.now();
      const staleTimeout = 10 * 60 * 1000; // 10 minutes
      
      for (const [userId, connection] of userConnections.entries()) {
        if (connection.socket && !connection.socket.connected) {
          console.log(`Removing stale connection for user ${userId}`);
          userConnections.delete(userId);
        }
      }
      
      // Cleanup expired temp bans
      for (const [userId, ban] of tempBans.entries()) {
        if (now > ban.expiration) {
          console.log(`Removing expired temp ban for user ${userId}`);
          tempBans.delete(userId);
        }
      }
    } catch (error) {
      console.error('Error during periodic cleanup:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  io.on('connection', async (socket) => {
    console.log('New Socket.IO connection:', socket.id);

    let userId: string | null = null;
    let userSession: any = null;
    let currentRoomId: string | null = null;
    let isManualDisconnect = false;

    // Set up error handling for this socket
    socket.on('error', (error) => {
      console.error(`Socket.IO error for ${socket.id}:`, error);
    });

    socket.on('connect_error', (error) => {
      console.error(`Socket.IO connect error for ${socket.id}:`, error);
    });

    socket.on('authenticate', async (data) => {
      try {
        console.log('Socket authentication attempt:', { userId: data.userId, socketId: socket.id });
        
        if (!data.userId) {
          console.error('Authentication failed: userId not provided');
          socket.emit('error', {
            message: 'Authentication failed: User ID is required',
          });
          return;
        }

        userId = data.userId;
        
        // Verify user exists before creating session
        const user = await storage.getUser(userId);
        if (!user) {
          console.error('Authentication failed: user not found');
          socket.emit('error', {
            message: 'Authentication failed',
            details: 'User not found'
          });
          return;
        }

        try {
          // Clean up any existing sessions for this user first
          const existingSockets = await io.in(`user_${userId}`).fetchSockets();
          for (const existingSocket of existingSockets) {
            if (existingSocket.id !== socket.id) {
              existingSocket.disconnect(true);
            }
          }

          userSession = await storage.createUserSession(userId, socket.id);
          await storage.updateUserOnlineStatus(userId, true);

          // Join user-specific room for notifications
          socket.join(`user_${userId}`);

          // Track connection for this user
          userConnections.set(userId, { socket, currentRoomId: null });

          console.log('Socket authentication successful for user:', userId);
          socket.emit('authenticated', {
            success: true,
            user: {
              id: user.id,
              username: user.username
            }
          });
        } catch (sessionError) {
          console.error('Session creation error:', sessionError);
          
          try {
            // Try to continue without session if user verification passed
            await storage.updateUserOnlineStatus(userId, true);
            socket.join(`user_${userId}`);
            userConnections.set(userId, { socket, currentRoomId: null });
            
            console.log('Socket authentication successful (fallback) for user:', userId);
            socket.emit('authenticated', {
              success: true,
              user: {
                id: user.id,
                username: user.username
              },
              warning: 'Session creation failed but authentication succeeded'
            });
          } catch (fallbackError) {
            console.error('Fallback authentication failed:', fallbackError);
            socket.emit('error', {
              message: 'Authentication failed',
              details: 'Unable to establish user session'
            });
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('error', {
          message: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('join_room', async (data) => {
      console.log('Join room request:', { roomId: data.roomId, userId, socketId: socket.id });

      if (!data.roomId || !userId) {
        console.error('Join room failed: missing data', { roomId: data.roomId, userId });
        socket.emit('error', {
          message: 'Missing room ID or user ID',
        });
        return;
      }

      try {
        // Get user data first
        const user = await storage.getUser(userId);
        if (!user) {
          console.error(`User ${userId} not found during join room attempt`);
          socket.emit('error', {
            message: 'User not found',
          });
          return;
        }
        
        console.log(`User ${user.username} (${userId}) attempting to join room ${data.roomId}`);

        console.log(`User ${user.username} attempting to join room ${data.roomId}`);

        // Check if user is banned from rooms
        if (user.isBanned) {
          socket.emit('error', {
            message: 'You are banned from sending messages in chat rooms',
          });
          return;
        }

        // Check for temporary bans
        const tempBan = tempBans.get(userId);
        if (tempBan) {
          if (Date.now() < tempBan.expiration) {
            const remainingTime = Math.ceil((tempBan.expiration - Date.now()) / 1000 / 60);
            socket.emit('error', {
              message: `You are temporarily banned from rooms for ${remainingTime} more minutes due to being kicked by admin ${tempBan.kickedBy}`,
            });
            return;
          } else {
            // Ban expired, remove it
            tempBans.delete(userId);
          }
        }

        // Check if user is already active in this room
        const isAlreadyInRoom = userConnections.get(userId)?.currentRoomId === data.roomId;

        if (!isAlreadyInRoom) {
          // Leave previous room if in another room
          if (userConnections.get(userId)?.currentRoomId) {
            try {
              await storage.leaveRoom(userConnections.get(userId)!.currentRoomId!, userId);
              socket.to(userConnections.get(userId)!.currentRoomId!).emit('user_left', {
                userId,
                roomId: userConnections.get(userId)!.currentRoomId!,
                username: user.username
              });
              socket.leave(userConnections.get(userId)!.currentRoomId!);
            } catch (leaveError) {
              console.error('Error leaving previous room:', leaveError);
            }
          }

          // Join new room
          socket.join(data.roomId);

          if (['1', '2', '3', '4'].includes(data.roomId)) {
            // Mock room handling
            if (!mockRoomMembers.has(data.roomId)) {
              mockRoomMembers.set(data.roomId, new Map());
            }
            const roomMembers = mockRoomMembers.get(data.roomId)!;
            roomMembers.set(userId, {
              id: userId,
              username: user.username,
              level: user.level || 1,
              isOnline: true,
              profilePhotoUrl: user.profilePhotoUrl,
              isAdmin: user.isAdmin || false
            });
          } else {
            // Real room
            await storage.joinRoom(data.roomId, userId);
          }

          // Update user's current room
          if (userConnections.has(userId)) {
            userConnections.get(userId)!.currentRoomId = data.roomId;
          }
          currentRoomId = data.roomId;

          // Send success confirmation to user
          socket.emit('room_joined', {
            roomId: data.roomId,
            success: true
          });

          // Broadcast to room members (excluding sender)
          socket.to(data.roomId).emit('user_joined', {
            userId,
            username: user.username,
            roomId: data.roomId,
          });

          console.log(`User ${user.username} successfully joined room ${data.roomId}`);
        } else {
          // Already in room, send confirmation
          socket.emit('room_joined', {
            roomId: data.roomId,
            success: true,
            message: 'Already in room'
          });
          console.log(`User ${userId} already in room ${data.roomId}`);
        }
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', {
          message: 'Failed to join room',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('leave_room', async (data) => {

      if (!data.roomId || !userId) return;

      try {
        // Get user data first
        const user = await storage.getUser(userId);

        // Check if user is actually in this room
        const userConn = userConnections.get(userId);
        if (userConn?.currentRoomId === data.roomId) {
          await storage.leaveRoom(data.roomId, userId);

          // Clear user's current room
          userConn.currentRoomId = null;
          currentRoomId = null;

          // Leave the Socket.IO room
          socket.leave(data.roomId);

          // Broadcast user leave message
          io.to(data.roomId).emit('new_message', {
            message: {
              id: `system-leave-${Date.now()}`,
              content: `${user?.username || 'User'} has left the room.`,
              senderId: 'system',
              roomId: data.roomId,
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

          console.log(`User ${user?.username || 'Unknown User'} left room ${data.roomId}`);
        } else {
          console.log(`User ${userId} not in room ${data.roomId}, skipping leave`);
        }
      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', {
          message: 'Failed to leave room',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('send_message', async (data) => {
      if (userId && data.content) {
        // Check if user is banned from rooms (only for room messages)
        if (data.roomId) {
          const currentUser = await storage.getUser(userId);
          if (currentUser?.isBanned) {
            socket.emit('error', {
              message: 'You are banned from sending messages in chat rooms',
            });
            return;
          }
        }

        if (data.roomId) {
          // Check if message is a kick command
          const kickCommandRegex = /^\/kick\s+(.+)$/i;
          const kickMatch = data.content.match(kickCommandRegex);

          if (kickMatch) {
            // Kick logic is handled by the backend API route, this is just a client-side handler
            // The client should ideally call the API endpoint directly for kicks.
            // For now, we'll just log it.
            console.log(`Client-side handler received /kick command for ${kickMatch[1]}`);
            return;
          }

          // Check if message is an add mod command
          const addModCommandRegex = /^\/add\s+mod\s+(.+)$/i;
          const addModMatch = data.content.match(addModCommandRegex);

          if (addModMatch) {
            const [, targetUsername] = addModMatch;
            const senderUser = await storage.getUser(userId);

            if (!senderUser) {
              return; // Should not happen if user is authenticated
            }

            // Check if sender is admin (level 1+) or room owner for user-created rooms
            let isAuthorized = false;

            if (['1', '2', '3', '4'].includes(data.roomId)) {
              // For system rooms, only admins (level 1+) can add moderators
              isAuthorized = (senderUser.level || 0) >= 1;
            } else {
              // For user-created rooms, check if user is the room creator
              const room = await storage.getChatRoom(data.roomId);
              isAuthorized = room && room.creatorId === userId;

              // Also allow if user is admin
              if (!isAuthorized) {
                isAuthorized = (senderUser.level || 0) >= 1;
              }
            }

            if (!isAuthorized) {
              const errorMessage = {
                id: `addmod-error-${Date.now()}`,
                content: `❌ Insufficient permissions to promote moderators.`,
                senderId: 'system',
                roomId: data.roomId,
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

              socket.emit('new_message', {
                message: errorMessage,
              });
              return;
            }

            // Find target user in room
            let targetUser = null;

            if (['1', '2', '3', '4'].includes(data.roomId)) {
              // Search in mock room members
              const roomMembers = mockRoomMembers.get(data.roomId);
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
              const roomMembers = await storage.getRoomMembers(data.roomId);
              targetUser = roomMembers?.find(member =>
                member.user.username.toLowerCase() === targetUsername.toLowerCase()
              )?.user;
            }

            if (!targetUser) {
              const notFoundMessage = {
                id: `addmod-error-${Date.now()}`,
                content: `❌ User '${targetUsername}' not found in this room.`,
                senderId: 'system',
                roomId: data.roomId,
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

              socket.emit('new_message', {
                message: notFoundMessage,
              });
              return;
            }

            // Check if user is already a moderator (level 3+) or admin (level 5+)
            if ((targetUser.level || 0) >= 3) {
              const alreadyModMessage = {
                id: `addmod-error-${Date.now()}`,
                content: `❌ ${targetUsername} is already a moderator or higher.`,
                senderId: 'system',
                roomId: data.roomId,
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

              socket.emit('new_message', {
                message: alreadyModMessage,
              });
              return;
            }

            try {
              // Update user level to moderator (level 3)
              await storage.updateUserLevel(targetUser.id, 3);

              // Update in mock room members if applicable
              if (['1', '2', '3', '4'].includes(data.roomId)) {
                const roomMembers = mockRoomMembers.get(data.roomId);
                if (roomMembers && roomMembers.has(targetUser.id)) {
                  const memberData = roomMembers.get(targetUser.id);
                  if (memberData) {
                    memberData.level = 3;
                    roomMembers.set(targetUser.id, memberData);
                  }
                }
              }

              // Broadcast success message to all room members
              const successMessage = {
                id: `addmod-success-${Date.now()}`,
                content: `✅ ${targetUsername} has been promoted to moderator by ${senderUser.username}`,
                senderId: 'system',
                roomId: data.roomId,
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

              // Broadcast to all room members
              io.to(data.roomId).emit('new_message', {
                message: successMessage,
              });

              // Force refresh member list to show new moderator status
              io.to(data.roomId).emit('forceMemberRefresh', {
                roomId: data.roomId
              });

            } catch (error) {
              console.error('Error promoting user to moderator:', error);

              const errorMessage = {
                id: `addmod-error-${Date.now()}`,
                content: `❌ Failed to promote ${targetUsername} to moderator.`,
                senderId: 'system',
                roomId: data.roomId,
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

              socket.emit('new_message', {
                message: errorMessage,
              });
            }
            return;
          }

          // Check if message is a whois command
          const whoisCommandRegex = /^\/whois\s+(.+)$/i;
          const whoisMatch = data.content.match(whoisCommandRegex);

          if (whoisMatch) {
            const [, targetUsername] = whoisMatch;

            // Find user in current room
            let targetUser = null;

            if (['1', '2', '3', '4'].includes(data.roomId)) {
              // Search in mock room members
              const roomMembers = mockRoomMembers.get(data.roomId);
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
              const roomMembers = await storage.getRoomMembers(data.roomId);
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
                roomId: data.roomId,
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
              socket.emit('new_message', {
                message: whoisInfo,
              });
            } else {
              // User not found
              const notFoundMessage = {
                id: `whois-error-${Date.now()}`,
                content: `❌ User '${targetUsername}' not found in this room.`,
                senderId: 'system',
                roomId: data.roomId,
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
              socket.emit('new_message', {
                message: notFoundMessage,
              });
            }
            return;
          }

          // Check if message is a /me command
          const meCommandRegex = /^\/me\s*(.*)$/i;
          const meMatch = data.content.match(meCommandRegex);

          if (meMatch) {
            const [, actionText] = meMatch;
            const senderUser = await storage.getUser(userId);

            // Create /me action message
            const meActionContent = actionText.trim() ?
              `* ${senderUser.username || 'User'} ${actionText.trim()}` :
              `* ${senderUser.username || 'User'}`;

            // For mock rooms
            if (['1', '2', '3', '4'].includes(data.roomId)) {
              const meMessage = {
                id: `me-${Date.now()}`,
                content: meActionContent,
                senderId: userId,
                roomId: data.roomId,
                recipientId: null,
                messageType: 'action',
                metadata: { isAction: true },
                createdAt: new Date().toISOString(),
                sender: {
                  id: userId,
                  username: senderUser.username || 'User',
                  level: senderUser.level || 1,
                  isOnline: senderUser.isOnline || true,
                  profilePhotoUrl: senderUser.profilePhotoUrl || null
                }
              };

              // Broadcast to room
              io.to(data.roomId).emit('new_message', {
                message: meMessage,
              });
            } else {
              // Real room message
              const messageData = insertMessageSchema.parse({
                content: meActionContent,
                senderId: userId,
                roomId: data.roomId,
                recipientId: null,
                messageType: 'action',
                metadata: { isAction: true },
              });

              const newMessage = await storage.createMessage(messageData);

              // Broadcast to room
              io.to(data.roomId).emit('new_message', {
                message: newMessage,
              });
            }
            return;
          }

          // For mock rooms (1-4), create a mock message instead of using database
          if (['1', '2', '3', '4'].includes(data.roomId)) {
            // Get user data for the mock message
            const senderUser = await storage.getUser(userId);

            const mockMessage = {
              id: `mock-${Date.now()}`,
              content: data.content,
              senderId: userId,
              roomId: data.roomId,
              recipientId: null,
              messageType: data.messageType || 'text',
              metadata: data.metadata || null,
              createdAt: new Date().toISOString(),
              sender: {
                id: userId,
                username: senderUser.username || 'User',
                level: senderUser.level || 1,
                isOnline: senderUser.isOnline || true,
                profilePhotoUrl: senderUser.profilePhotoUrl || null
              }
            };

            // Broadcast to room
            io.to(data.roomId).emit('new_message', {
              message: mockMessage,
            });
          } else {
            // Real room message
            const messageData = insertMessageSchema.parse({
              content: data.content,
              senderId: userId,
              roomId: data.roomId,
              recipientId: null,
              messageType: data.messageType || 'text',
              metadata: data.metadata || null,
            });

            const newMessage = await storage.createMessage(messageData);

            // Broadcast to room
            io.to(data.roomId).emit('new_message', {
              message: newMessage,
            });
          }
        } else if (data.recipientId) {
          // Direct message
          const directMessage = await storage.createDirectMessage({
            content: data.content,
            senderId: userId,
            recipientId: data.recipientId,
            messageType: data.messageType || 'text'
          });

          // Send to recipient
          broadcastToUser(data.recipientId, {
            type: 'new_direct_message',
            message: directMessage,
          });

          // Send confirmation to sender
          socket.emit('message_sent', {
            message: directMessage,
          });
        }
      }
    });

    socket.on('typing', (data) => {
      if (userId && data.roomId) {
        socket.to(data.roomId).emit('user_typing', {
          userId,
          roomId: data.roomId,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`Socket.IO disconnection - ID: ${socket.id}, Reason: ${reason}, UserID: ${userId}`);
      
      if (userId) {
        try {
          // Remove from user connections tracking
          const connection = userConnections.get(userId);
          if (connection && connection.socket.id === socket.id) {
            userConnections.delete(userId);

            // Don't update offline status immediately - user might reconnect quickly
            setTimeout(async () => {
              try {
                // Check if user has reconnected in the meantime
                if (!userConnections.has(userId)) {
                  await storage.updateUserOnlineStatus(userId, false);
                  console.log(`User ${userId} marked as offline after grace period.`);
                }
              } catch (error) {
                console.error(`Error updating offline status for user ${userId}:`, error);
              }
            }, 5000); // 5 second grace period

            // Clean up user session
            if (userSession && userSession.socketId === socket.id) {
              try {
                await storage.removeUserSession(userSession.socketId);
                console.log(`User session removed for ${userId} (socket: ${socket.id})`);
              } catch (error) {
                console.error(`Error removing user session for ${userId}:`, error);
              }
            }

            // Clean up room membership on disconnect
            if (currentRoomId) {
              try {
                const disconnectedUser = await storage.getUser(userId);

                if (['1', '2', '3', '4'].includes(currentRoomId)) {
                  // Mock room handling
                  if (mockRoomMembers.has(currentRoomId)) {
                    const roomMembersMap = mockRoomMembers.get(currentRoomId)!;

                    // Remove all entries for this user
                    const keysToRemove: string[] = [];
                    roomMembersMap.forEach((memberData, memberId) => {
                      if (memberId === userId || (disconnectedUser && memberData.username === disconnectedUser.username)) {
                        keysToRemove.push(memberId);
                      }
                    });

                    keysToRemove.forEach(key => {
                      roomMembersMap.delete(key);
                      console.log(`Cleaned up user entry ${key} on disconnect from mock room ${currentRoomId}`);
                    });

                    // Only broadcast leave message for unexpected disconnects (not manual)
                    if (disconnectedUser && disconnectedUser.username && reason !== 'client namespace disconnect') {
                      io.to(currentRoomId).emit('new_message', {
                        message: {
                          id: `system-leave-${Date.now()}`,
                          content: `${disconnectedUser.username} has left the room.`,
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

                    // Broadcast room count update to all clients
                    try {
                      const currentCount = await getRoomMemberCount(currentRoomId);
                      io.emit('room_member_count_updated', {
                        roomId: currentRoomId,
                        memberCount: currentCount
                      });
                    } catch (countError) {
                      console.error(`Error getting room member count for ${currentRoomId}:`, countError);
                    }
                  }
                } else {
                  // For real rooms, ensure cleanup
                  await storage.leaveRoom(currentRoomId, userId);
                  console.log(`User ${userId} left real room ${currentRoomId}`);
                }
              } catch (roomError) {
                console.error(`Error cleaning up room ${currentRoomId} for user ${userId}:`, roomError);
              }
            }
          }
        } catch (error) {
          console.error(`Error during disconnect cleanup for user ${userId}:`, error);
        }
      }
      
      console.log(`Socket.IO connection closed: ${socket.id}`);
    });
  });

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
      console.error(`Error getting member count for room ${roomId}:`, error);
      return 0;
    }
  }

  function broadcastToUser(userId: string, message: any) {
    const userSocket = userConnections.get(userId)?.socket;
    if (userSocket) {
      // Ensure the message has a consistent structure
      const payload = message.type
        ? { type: message.type, ...message[message.type] } // For structured messages like { type: 'new_notification', notification: {...} }
        : message; // For simpler messages

      userSocket.emit(message.type || 'message', payload); // Use 'message' as a fallback event type
    } else {
      // If user is not currently connected, message might not be delivered in real-time.
      // In a more robust system, you might use push notifications or queue messages.
      console.log(`User ${userId} not found in active connections. Message not delivered in real-time.`);
    }
  }

  return httpServer;
}