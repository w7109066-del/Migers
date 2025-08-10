import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "chatme-chat-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }

        // Update user online status
        await storage.updateUserOnlineStatus(user.id, true);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      if (!id || typeof id !== 'string') {
        console.error('Invalid user ID in deserialize:', id);
        return done(null, false);
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error('Passport deserialize error:', error);
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Additional server-side username validation
      const { username } = req.body;

      // Validate username format
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check length
      if (username.length < 4 || username.length > 12) {
        return res.status(400).json({ message: "Username must be 4-12 characters long" });
      }

      // Check valid characters (lowercase letters, numbers, dots only)
      if (!/^[a-z0-9.]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, and dots" });
      }

      // Check for invalid dot patterns
      if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return res.status(400).json({ message: "Invalid dot usage in username" });
      }

      // Check for reserved usernames
      const reservedUsernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp', 'test', 'guest', 'user', 'support'];
      if (reservedUsernames.includes(username.toLowerCase())) {
        return res.status(400).json({ message: "This username is reserved" });
      }

      const validatedData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ message: firstError.message });
      }
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.user) {
      await storage.updateUserOnlineStatus(req.user.id, false);
    }

    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(req.user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Authentication error" });
    }
  });
}