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
import { directMessages, users, messages, friendships, notifications } from "@shared/schema";
import bcrypt from "bcryptjs";

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
        const senderSocket = userConnections.get(currentUserId)?.ws;
        const receiverSocket = userConnections.get(userId)?.ws;

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
      const conversations = await storage.getDirectMessageConversations(req.user!.id);

      // Ensure we always return a valid JSON array
      if (!Array.isArray(conversations)) {
        console.warn('Conversations is not an array, returning empty array');
        return res.json([]);
      }

      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Always return JSON, never HTML error pages
      res.status(500).json({ 
        error: 'Failed to fetch conversations',
        message: error instanceof Error ? error.message : 'Unknown error',
        conversations: [] // Provide fallback empty array
      });
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

  // Track user connections and their current rooms
  const userConnections = new Map<string, { ws: WebSocket; currentRoomId: string | null }>();

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    let userId: string | null = null;
    let userSession: any = null;
    let currentRoomId: string | null = null;
    let isManualDisconnect = false;

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

              // Track connection for this user
              userConnections.set(userId, { ws, currentRoomId: null });

              ws.send(JSON.stringify({
                type: 'authenticated',
                success: true,
              }));
            }
            break;

          case 'join_room':
            if (!message.roomId || !userId) break;

            try {
              // Get user data first
              const user = await storage.getUser(userId);
              if (!user) {
                console.log(`User ${userId} not found during join room attempt`);
                break;
              }

              console.log(`User ${user.username} attempting to join room ${message.roomId}`);

              // Check if user is already active in this room
              const isAlreadyInRoom = userConnections.get(userId)?.currentRoomId === message.roomId;

              if (!isAlreadyInRoom) {
                // Add user to room
                await storage.joinRoom(message.roomId, userId);

                // Update user's current room
                const userConn = userConnections.get(userId);
                if (userConn) {
                  userConn.currentRoomId = message.roomId;
                }
                currentRoomId = message.roomId;

                // Broadcast system message about user joining
                broadcastToRoom(message.roomId, {
                  type: 'new_message',
                  message: {
                    id: `system-join-${userId}-${Date.now()}`,
                    content: `${user.username} has entered`,
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

                console.log(`User ${user.username} joined room ${message.roomId}`);
              } else {
                console.log(`User ${userId} already in room ${message.roomId}, skipping duplicate join`);
              }
            } catch (error) {
              console.error('Join room error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to join room',
                details: error instanceof Error ? error.message : 'Unknown error'
              }));
            }
            break;

          case 'leave_room':
            if (!message.roomId || !userId) break;

            try {
              // Get user data first
              const user = await storage.getUser(userId);
              
              // Check if user is actually in this room
              const userConn = userConnections.get(userId);
              if (userConn?.currentRoomId === message.roomId) {
                await storage.leaveRoom(message.roomId, userId);

                // Clear user's current room
                userConn.currentRoomId = null;
                currentRoomId = null;

                // Broadcast user left message
                broadcastToRoom(message.roomId, {
                  type: 'user_left',
                  userId,
                  roomId: message.roomId,
                  username: user?.username || 'Unknown User'
                }, ws);

                console.log(`User ${user?.username || 'Unknown User'} left room ${message.roomId}`);
              } else {
                console.log(`User ${userId} not in room ${message.roomId}, skipping leave`);
              }
            } catch (error) {
              console.error('Leave room error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to leave room',
                details: error instanceof Error ? error.message : 'Unknown error'
              }));
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
                  const senderUser = await storage.getUser(userId);

                  // Create /me action message
                  const meActionContent = actionText.trim() ? 
                    `* ${senderUser.username || 'User'} ${actionText.trim()}` : 
                    `* ${senderUser.username || 'User'}`;

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
                        username: senderUser.username || 'User',
                        level: senderUser.level || 1,
                        isOnline: senderUser.isOnline || true,
                        profilePhotoUrl: senderUser.profilePhotoUrl || null
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
                  const senderUser = await storage.getUser(userId);

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
                      username: senderUser.username || 'User',
                      level: senderUser.level || 1,
                      isOnline: senderUser.isOnline || true,
                      profilePhotoUrl: senderUser.profilePhotoUrl || null // Include profilePhotoUrl
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

        // Don't update offline status immediately - user might reconnect quickly
        setTimeout(async () => {
          // Check if user has reconnected in the meantime
          if (!userConnections.has(userId)) {
            await storage.updateUserOnlineStatus(userId, false);
          }
        }, 5000);

        if (userSession) {
          await storage.removeUserSession(userSession.socketId);
        }

        // Clean up room membership on disconnect
        if (currentRoomId) {
          const disconnectedUser = await storage.getUser(userId);

          if (['1', '2', '3', '4'].includes(currentRoomId)) {
            if (mockRoomMembers.has(currentRoomId)) {
              const roomMembersMap = mockRoomMembers.get(currentRoomId)!;

              // Remove ALL entries for this user (by ID and username)
              const toRemove = [];
              for (const [memberId, memberData] of roomMembersMap) {
                if (memberId === userId || memberData.username === disconnectedUser?.username) {
                  toRemove.push(memberId);
                }
              }

              // Remove all found entries
              for (const id of toRemove) {
                roomMembersMap.delete(id);
                console.log(`Cleaned up user entry ${id} on disconnect from room ${currentRoomId}`);
              }

              // Only send leave message if it was a manual disconnect
              if (isManualDisconnect && disconnectedUser?.username && disconnectedUser.username !== 'undefined') {
                broadcastToRoom(currentRoomId, {
                  type: 'new_message',
                  message: {
                    id: `system-leave-${Date.now()}`,
                    content: `${disconnectedUser.username} has left`,
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
          } else {
            // For real rooms, ensure cleanup
            await storage.leaveRoom(currentRoomId, userId);
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

  const broadcastToRoom = (roomId: string, message: any, excludeWs?: WebSocket) => {
    for (const [connUserId, userConn] of userConnections.entries()) {
      if (userConn.ws !== excludeWs && userConn.ws.readyState === WebSocket.OPEN) {
        // For now, broadcast to all connected users
        // In a real implementation, you'd check if the user is in the room
        userConn.ws.send(JSON.stringify(message));
      }
    }
  };

  function broadcastToUser(userId: string, message: any) {
    const userWs = userConnections.get(userId)?.ws;
    if (userWs && userWs.readyState === WebSocket.OPEN) {
      userWs.send(JSON.stringify(message));
    } else {
      // Fallback: broadcast to all clients if direct connection not found
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}