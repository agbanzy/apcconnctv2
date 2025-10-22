import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// ============================================================================
// CRON SERVICE INTEGRATION
// ============================================================================
// Uncomment the following lines to enable automated cron jobs
// import { cronService, initializeCronJobs } from "./cron-service";

// ============================================================================
// PUSH NOTIFICATION SERVICE INTEGRATION
// ============================================================================
// Uncomment the following line to enable push notifications
// import { pushService } from "./push-service";

const app = express();

// Trust proxy for Replit deployment environment
// This allows express to trust the X-Forwarded-* headers from the proxy
app.set('trust proxy', 1);

// ============================================================================
// SECURITY HEADERS WITH HELMET.JS
// ============================================================================
// Different CSP policies for development vs production environments
const isDevelopment = process.env.NODE_ENV === "development";

// Production CSP: Strict security without unsafe-inline or unsafe-eval
const productionCSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "https://fonts.googleapis.com"],
  styleSrc: ["'self'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "ws:", "wss:"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
};

// Development CSP: Permissive to allow HMR and development tools
const developmentCSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "ws:", "wss:"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
};

if (!isDevelopment) {
  console.log("🔒 Production mode: Using strict Content Security Policy");
} else {
  console.log("⚠️  Development mode: Using permissive CSP for HMR");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: isDevelopment ? developmentCSP : productionCSP,
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for socket.io
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));
// ============================================================================

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Apply general rate limiting to all API endpoints
app.use("/api/", apiLimiter);

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

  // ============================================================================
  // INITIALIZE CRON JOBS
  // ============================================================================
  // Uncomment the following lines to start automated scheduled tasks
  // 
  // STEP 1: Initialize and register all cron jobs
  // initializeCronJobs();
  // 
  // STEP 2: Start the cron service
  // cronService.start();
  // 
  // This will start all registered jobs according to their schedules:
  // - Event reminders: Daily at 8 AM
  // - Dues reminders: 1st of every month
  // - Membership renewals: Every Sunday
  // - Election notifications: 9 AM, 3 PM, 8 PM daily
  // - Inactive member cleanup: 1st of month at 2 AM
  // - Analytics aggregation: Daily at midnight
  // 
  // Environment variables required:
  // - ENABLE_CRON_JOBS=true (to enable jobs)
  // - TIMEZONE=Africa/Lagos (default timezone)
  // 
  // For manual testing in development:
  // await cronService.runJob("event-reminders");
  // await cronService.runJob("dues-reminders");
  // etc.
  // ============================================================================

  // ============================================================================
  // INITIALIZE PUSH NOTIFICATION SERVICE
  // ============================================================================
  // The push notification service is initialized automatically when imported.
  // It runs in simulation mode by default (console logging only).
  // 
  // To enable actual push notifications:
  // 
  // OPTION 1: Firebase Cloud Messaging (FCM) - For mobile apps
  // ----------------------------------------------------------
  // 1. Set environment variables:
  //    PUSH_SERVICE_PROVIDER=fcm
  //    FCM_SERVER_KEY=your-server-key
  //    FCM_PROJECT_ID=your-project-id
  // 2. Install Firebase Admin SDK: npm install firebase-admin
  // 3. Uncomment the import statement at the top of this file
  // 
  // OPTION 2: OneSignal - For web and mobile
  // -----------------------------------------
  // 1. Set environment variables:
  //    PUSH_SERVICE_PROVIDER=onesignal
  //    ONESIGNAL_API_KEY=your-api-key
  //    ONESIGNAL_APP_ID=your-app-id
  // 2. Install OneSignal SDK: npm install @onesignal/node-onesignal
  // 3. Uncomment the import statement at the top of this file
  // 
  // OPTION 3: Web Push (VAPID) - For web only
  // ------------------------------------------
  // 1. Generate VAPID keys: npx web-push generate-vapid-keys
  // 2. Set environment variables:
  //    PUSH_SERVICE_PROVIDER=web-push
  //    VAPID_PUBLIC_KEY=your-public-key
  //    VAPID_PRIVATE_KEY=your-private-key
  //    VAPID_SUBJECT=mailto:admin@apcconnect.ng
  // 3. Install web-push: npm install web-push
  // 4. Uncomment the import statement at the top of this file
  // 
  // Usage in code (after uncommenting the import):
  // -----------------------------------------------
  // import { pushService, NotificationTemplates } from "./push-service";
  // 
  // // Send to a single user
  // await pushService.sendPushNotification(
  //   userId,
  //   NotificationTemplates.eventReminder("Town Hall", "tomorrow", "event-123")
  // );
  // 
  // // Broadcast to all users
  // await pushService.broadcast(
  //   NotificationTemplates.systemAnnouncement("Important", "System update tonight")
  // );
  // 
  // // Send to a segment
  // await pushService.sendToSegment(
  //   "ward-leaders",
  //   NotificationTemplates.taskAssignment("Organize meeting", "high", "task-456")
  // );
  // 
  // Health check (for monitoring):
  // ------------------------------
  // const health = pushService.getHealthCheck();
  // console.log("Push service status:", health.status);
  // console.log("Provider:", health.provider);
  // console.log("Configured:", health.configured);
  // ============================================================================

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN - STOP CRON JOBS
  // ============================================================================
  // Handle graceful shutdown to stop all cron jobs
  // This ensures jobs are not interrupted mid-execution
  // 
  // process.on("SIGTERM", async () => {
  //   log("SIGTERM signal received: closing HTTP server and stopping cron jobs");
  //   
  //   // Stop all cron jobs
  //   cronService.stop();
  //   
  //   // Close HTTP server
  //   server.close(() => {
  //     log("HTTP server closed");
  //     process.exit(0);
  //   });
  // });
  // 
  // process.on("SIGINT", async () => {
  //   log("SIGINT signal received: closing HTTP server and stopping cron jobs");
  //   
  //   // Stop all cron jobs
  //   cronService.stop();
  //   
  //   // Close HTTP server
  //   server.close(() => {
  //     log("HTTP server closed");
  //     process.exit(0);
  //   });
  // });
  // ============================================================================
})();
