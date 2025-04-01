import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createStorage } from "./storage";
import { validateEnv } from "./env";
import fs from "fs";
import path from "path";

// Set up environment variables for the client
// Create a .env file in the client directory with the VITE_ prefixed variables
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFilePath = path.resolve(__dirname, "../client/.env");
try {
  const envContent = `
VITE_HF_API_KEY=${process.env.HF_API_KEY || ""}
`;
  fs.writeFileSync(envFilePath, envContent);
  log("Client environment variables set up successfully", "express");
} catch (error) {
  log(`Failed to set up client environment variables: ${error}`, "express");
}

// Validate server environment variables
validateEnv();

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
  // Initialize storage (this will connect to MongoDB if MONGODB_URI is set)
  try {
    // Set a timeout to prevent hanging during storage initialization
    const storageInitTimeout = setTimeout(() => {
      log("Storage initialization timed out. Continuing with server startup.", "express");
    }, 5000);
    
    // Try to initialize storage, but don't wait indefinitely
    await Promise.race([
      createStorage(),
      new Promise(resolve => setTimeout(() => {
        log("Storage initialization taking too long. Continuing with server startup.", "express");
        resolve(null);
      }, 5000))
    ]);
    
    clearTimeout(storageInitTimeout);
    log("Storage initialization completed", "express");
  } catch (error) {
    log(`Storage initialization error: ${error}. Continuing with server startup.`, "express");
  }
  
  const server = await registerRoutes(app);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
