import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import './bots/lowcard';

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