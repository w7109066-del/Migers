import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import './bots/lowcard';
import { Server, Socket } from "socket.io";
import http from "http";
import { createServer } from "http";
import { handleLowCardBot } from "./bots/lowcard";
import * as db from "./db";
import { messages } from "../shared/schema";
import path from "path";


const PostgresSessionStore = connectPg(session);

// Helper function to parse session from cookie
async function getSessionFromCookie(cookieString: string) {
  return new Promise((resolve, reject) => {
    const store = new PostgresSessionStore({ pool, createTableIfMissing: true });

    // Extract session ID from cookie
    const sessionIdMatch = cookieString.match(/connect\.sid=s%3A([^;]+)/);
    if (!sessionIdMatch) {
      resolve(null);
      return;
    }

    const sessionId = sessionIdMatch[1].split('.')[0];

    store.get(sessionId, (err, sessionData) => {
      if (err) {
        reject(err);
      } else {
        resolve(sessionData);
      }
    });
  });
}


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from client/public directory
app.use(express.static(path.join(import.meta.dirname, '..', 'client', 'public')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const httpServer = registerRoutes(app);

  const PORT = parseInt(process.env.PORT || "5000", 10);

  // Start automatic mentor expiration check
  setInterval(async () => {
    try {
      console.log('Running automatic mentor expiration check...');
      const { storage } = await import('./storage');
      const expiredMentors = await storage.checkAndExpireMentors();

      if (expiredMentors.length > 0) {
        console.log(`Automatically expired ${expiredMentors.length} mentors:`, expiredMentors.map(m => m.username));
      }
    } catch (error) {
      console.error('Error in automatic mentor expiration check:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
})();

const server = createServer(app);
const io = new Server(server, {
  pingInterval: 10000, // setiap 10 detik kirim ping
  pingTimeout: 30000,  // tunggu hingga 30 detik sebelum dianggap mati
  transports: ['websocket'],
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://your-domain.com"]
      : ["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on("connection", async (socket: Socket) => {
  console.log("A user connected:", socket.id);

  // Authenticate user and attach user info to socket
  const cookieString = socket.handshake.headers.cookie;
  if (cookieString) {
    try {
      const session = await getSessionFromCookie(cookieString);
      if (session && session.user) {
        socket.userId = session.user.id;
        socket.username = session.user.username;
        console.log(`User authenticated: ${socket.username} (ID: ${socket.userId})`);
      } else {
        console.log("User session not found or invalid for socket:", socket.id);
      }
    } catch (error) {
      console.error("Error authenticating socket user:", error);
    }
  } else {
    console.log("No cookie found for socket:", socket.id);
  }

  // Handle room joining
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.username} joined room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      username: socket.username
    });
  });

  // Handle room leaving
  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`User ${socket.username} left room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit('user_left', {
      userId: socket.userId,
      username: socket.username
    });
  });

  // Initialize LowCard bot for this socket connection
  console.log('Initializing LowCard bot for socket:', socket.id);
  handleLowCardBot(io, socket);

  // Handle sending messages
  socket.on('send_message', async (data: {
    roomId: string;
    message: string;
    media?: Express.Multer.File;
    gift?: { name: string; quantity: number }
  }) => {
    try {
      console.log('Received message data:', data);

      // Check if message is a bot command
      if (data.message.startsWith('/add bot lowcard')) {
        // Don't save this command to database - just emit bot message
        io.to(data.roomId).emit('bot_message', 'LowCardBot', 'LowCardBot has joined the room! Type !start <bet> to begin playing.', null, data.roomId);
        return; // Exit early - don't save command message
      }

      // Bot commands are now handled in routes.ts - remove duplicate handling

      // Save message to database
      await db.insert(messages).values({
        content: data.message,
        senderId: socket.userId,
        roomId: data.roomId,
        messageType: data.gift ? 'gift' : data.media ? 'image' : 'text',
        metadata: data.gift ? { gift: data.gift } : data.media ? { media: `/uploads/${data.media.filename}` } : null
      });

      // Emit to all users in the room
      io.to(data.roomId).emit('message', {
        message: data.message,
        username: socket.username,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
        gift: data.gift,
        media: data.media ? `/uploads/${data.media.filename}` : null
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});