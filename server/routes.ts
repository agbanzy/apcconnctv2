import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import QRCode from "qrcode";
import OpenAI from "openai";
import crypto from "crypto";
import { db } from "./db";
import { pool } from "./db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, inArray, or as drizzleOr, isNull as drizzleIsNull, ilike } from "drizzle-orm";
import { z } from "zod";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";
import { ninService, validateNINFormat, NINVerificationErrorCode } from "./nin-service";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, getRefreshTokenExpiry, hashRefreshToken, verifyRefreshTokenHash } from "./jwt-utils";
import { pushService, NotificationTemplates } from "./push-service";
import { apiLimiter, authLimiter, votingLimiter, quizLimiter, taskLimiter, eventCheckInLimiter } from "./middleware/rate-limit";
import { errorHandler, createError } from "./middleware/error-handler";
import { logAudit, AuditActions } from "./utils/audit-logger";
import { quizAntiCheat, taskAntiCheat, voteAntiCheat, eventAntiCheat } from "./middleware/anti-cheat";
import { antiCheatService } from "./security/anti-cheat";
import { generateQuizToken, verifyQuizToken } from "./security/crypto-tokens";
import { seedAdminBoundaries } from "./seed-admin-boundaries";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { storage } from "./storage";
import { FilterDTO } from "@shared/admin-types";
import pointsRouter from "./routes/points";
import userTasksRouter from "./routes/user-tasks";
import socialSharesRouter from "./routes/social-shares";
import referralsRouter from "./routes/referrals";
import leaderboardsRouter from "./routes/leaderboards";
import { PointLedgerService } from "./services/point-ledger";
import * as memberAccountService from "./services/member-account";

const PgSession = ConnectPgSimple(session);

// Flutterwave configuration
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY as string;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

type UserType = typeof schema.users.$inferSelect;

interface AuthRequest extends Request {
  user?: UserType;
  antiCheat?: {
    ipAddress: string;
    userAgent: string;
    fingerprint?: string;
    coordinates?: { lat: number; lng: number };
    memberId?: string;
  };
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      role: string | null;
      createdAt: Date | null;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  // ============================================================================
  // SESSION SECRET VALIDATION
  // ============================================================================
  // In production, SESSION_SECRET must be set and cannot use the default value
  const SESSION_SECRET = process.env.SESSION_SECRET || "apc-connect-secret-key-2024";
  const isProduction = process.env.NODE_ENV === "production";
  const isDefaultSecret = SESSION_SECRET === "apc-connect-secret-key-2024";

  if (isProduction) {
    if (!process.env.SESSION_SECRET || isDefaultSecret) {
      console.error("\n" + "=".repeat(80));
      console.error("CRITICAL SECURITY ERROR: SESSION_SECRET Not Configured");
      console.error("=".repeat(80));
      console.error("Production environment detected but SESSION_SECRET is not set or using default value.");
      console.error("This is a critical security vulnerability that could compromise user sessions.");
      console.error("");
      console.error("To fix this:");
      console.error("1. Generate a strong random secret:");
      console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
      console.error("2. Set the SESSION_SECRET environment variable to this value");
      console.error("3. Restart the application");
      console.error("=".repeat(80) + "\n");
      throw new Error("SESSION_SECRET must be set in production environment");
    }
  } else {
    // Development mode warning
    if (!process.env.SESSION_SECRET || isDefaultSecret) {
      console.warn("\n⚠️  WARNING: Using default SESSION_SECRET in development mode");
      console.warn("   For production, set a secure SESSION_SECRET environment variable\n");
    }
  }
  // ============================================================================

  app.use(
    session({
      store: new PgSession({ pool, createTableIfMissing: true }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
      },
      proxy: true, // Trust the reverse proxy
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Accept JWT bearer tokens for mobile clients on all API routes.
  // Session auth remains the default for web; JWT simply hydrates req.user.
  app.use(async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (req.user) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return next();
    }

    try {
      const userId = verifyAccessToken(accessToken);
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (user) {
        req.user = user as Express.User;
      } else {
        (req as any).jwtAuthError = "User not found";
      }
    } catch (error) {
      (req as any).jwtAuthError =
        error instanceof Error ? error.message : "Invalid access token";
    }

    next();
  });

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email)
        });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, id)
      });
      done(null, user as Express.User || null);
    } catch (error) {
      done(error);
    }
  });

  const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated?.() && !req.user) {
      const jwtAuthError = (req as any).jwtAuthError;
      return res.status(401).json({
        success: false,
        error: jwtAuthError || "Unauthorized",
      });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role || "member")) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
      next();
    };
  };

  // ============================================================================
  // ID CARD TOKEN UTILITIES
  // ============================================================================
  const generateIdCardToken = (memberId: string, nonce: string): string => {
    const secret = SESSION_SECRET;
    const payload = `${memberId}:${nonce}:${Date.now()}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  };

  const verifyIdCardToken = async (memberId: string, token: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Get the latest non-revoked ID card for this member
      const idCard = await db.query.memberIdCards.findFirst({
        where: and(
          eq(schema.memberIdCards.memberId, memberId),
          sql`${schema.memberIdCards.revokedAt} IS NULL`
        ),
        orderBy: desc(schema.memberIdCards.lastGeneratedAt),
      });

      if (!idCard) {
        return { valid: false, error: "ID card not found or has been revoked" };
      }

      // Regenerate the token with the stored nonce
      const expectedToken = generateIdCardToken(memberId, idCard.signatureNonce);
      
      if (token !== expectedToken) {
        return { valid: false, error: "Invalid signature" };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error verifying ID card token:", error);
      return { valid: false, error: "Verification failed" };
    }
  };

  // ============================================================================
  // RATE LIMITING MIDDLEWARE
  // ============================================================================
  // Apply general API rate limiter to all /api/* routes (100 requests per 15 minutes)
  // This provides baseline protection against request floods for all API endpoints
  // Specific endpoints may have additional, stricter rate limiters (e.g., authLimiter, votingLimiter)
  app.use("/api", apiLimiter);

  app.post("/api/auth/register", authLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const userData = schema.insertUserSchema.parse(req.body);
      const { wardId, ...memberData } = req.body;

      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, userData.email)
      });

      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await db.insert(schema.users).values({
        ...userData,
        password: hashedPassword
      }).returning();

      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      const memberId = `APC-${year}-NG-${random}`;

      // Generate unique referral code
      const referralCode = `APC${userData.firstName.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Check if referred by someone
      const { referralCode: referrerCode } = req.body;
      let referrerId = null;
      
      if (referrerCode) {
        const referrer = await db.query.members.findFirst({
          where: eq(schema.members.referralCode, referrerCode)
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      const [member] = await db.insert(schema.members).values({
        userId: user.id,
        memberId,
        wardId: wardId || "",
        status: "pending", // Member starts as 'pending' until NIN is verified
        referralCode,
        referredBy: referrerId,
        // NIN fields initialized during registration:
        // nin: null,                     // Will be set during NIN verification
        // ninVerified: false,            // Default: false (not verified yet)
        // ninVerificationAttempts: 0,    // Tracks verification attempts
        // ninVerifiedAt: null            // Timestamp when NIN is verified
      }).returning();

      // Create referral record if referred
      if (referrerId) {
        await db.insert(schema.referrals).values({
          referrerId,
          referredId: member.id,
          status: "pending",
          pointsEarned: 0
        });
      }

      // ========================================================================
      // NIN VERIFICATION FLOW INTEGRATION POINT
      // ========================================================================
      // 
      // OPTION 1: OPTIONAL NIN VERIFICATION DURING REGISTRATION
      // --------------------------------------------------------
      // Allow members to optionally provide NIN during registration for immediate verification.
      // This can streamline the onboarding process for members who have their NIN ready.
      //
      // Implementation:
      // 1. Frontend sends optional NIN and dateOfBirth fields in registration request
      // 2. Backend validates and verifies NIN if provided
      // 3. Member account is activated immediately upon successful verification
      // 4. If verification fails, member is still registered but remains in 'pending' status
      //
      // Example code:
      /*
      const { nin, dateOfBirth } = req.body;
      
      if (nin && dateOfBirth) {
        console.log(`Attempting NIN verification during registration for ${memberId}`);
        
        // Validate NIN format before calling API
        if (!validateNINFormat(nin)) {
          console.log("Invalid NIN format provided during registration");
          // Continue registration but don't verify - member can verify later
        } else {
          try {
            // Verify NIN with NIMC API
            const verificationResult = await ninService.verifyNIN({
              nin,
              firstName: user.firstName,
              lastName: user.lastName,
              dateOfBirth
            });

            if (verificationResult.success && verificationResult.data?.verified) {
              // Update member with verified NIN
              await db.update(schema.members)
                .set({
                  nin: verificationResult.data.nin,
                  ninVerified: true,
                  ninVerifiedAt: new Date(),
                  ninVerificationAttempts: 1,
                  status: "active" // Activate account immediately
                })
                .where(eq(schema.members.id, member.id));
              
              console.log(`NIN verified successfully during registration for ${memberId}`);
              
              // Update local member object to reflect changes
              member.nin = verificationResult.data.nin;
              member.ninVerified = true;
              member.ninVerifiedAt = new Date();
              member.status = "active";
            } else {
              // Verification failed - increment attempt counter
              await db.update(schema.members)
                .set({
                  ninVerificationAttempts: 1
                })
                .where(eq(schema.members.id, member.id));
              
              console.log(`NIN verification failed during registration for ${memberId}: ${verificationResult.message}`);
            }
          } catch (error) {
            console.error("NIN verification error during registration:", error);
            // Continue with registration even if verification fails
          }
        }
      }
      */
      //
      // OPTION 2: POST-REGISTRATION NIN VERIFICATION (CURRENT APPROACH)
      // ----------------------------------------------------------------
      // Members register without NIN and verify later via the profile page.
      // This is the current implementation - members call POST /api/members/:id/verify-nin
      // 
      // Benefits:
      // - Simpler registration flow
      // - Members can complete registration without NIN immediately available
      // - Allows members to gather required documents before verification
      //
      // UX Flow:
      // 1. Member registers → Account created with status: "pending"
      // 2. Member navigates to profile/settings page
      // 3. Member enters NIN + date of birth → Calls /api/members/:id/verify-nin
      // 4. Upon successful verification:
      //    - members.nin field is updated with verified NIN
      //    - members.ninVerified is set to true
      //    - members.ninVerifiedAt is set to current timestamp
      //    - members.status is changed from "pending" to "active"
      // 5. Upon failed verification:
      //    - members.ninVerificationAttempts is incremented
      //    - Member can retry up to MAX_VERIFICATION_ATTEMPTS (default: 10)
      //    - Error message is shown with remaining attempts
      //
      // Database fields managed during NIN verification:
      // - nin: Stores the 11-digit NIN after successful verification
      // - ninVerified: Boolean flag indicating verification status
      // - ninVerifiedAt: Timestamp of when verification succeeded
      // - ninVerificationAttempts: Counter for failed/total verification attempts
      // - status: Updated from "pending" to "active" after successful verification
      //
      // ========================================================================

      // EMAIL INTEGRATION POINT: Send welcome email to new member
      // Uncomment the following code when ready to send welcome emails:
      /*
      await emailService.sendWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        memberId: member.memberId,
        referralCode: member.referralCode
      });
      */

      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: "Login failed after registration" });
        }
        
        await logAudit({
          userId: user.id,
          memberId: member.id,
          action: AuditActions.REGISTER,
          details: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: "success",
        });
        
        return res.json({ success: true, data: { user, member } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, (req: AuthRequest, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ success: false, error: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ success: false, error: "Login failed" });
        }

        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, user.id)
        });

        await logAudit({
          userId: user.id,
          memberId: member?.id,
          action: AuditActions.LOGIN,
          details: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: "success",
        });

        // SMS INTEGRATION POINT: Send OTP for two-factor authentication
        // Uncomment the following code when ready to enable 2FA with SMS:
        /*
        if (user.phone) {
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          // Store OTP in database or cache (e.g., Redis) with expiry
          await smsService.sendOTPSMS(user.phone, otpCode);
          // Return response requiring OTP verification before completing login
        }
        */

        return res.json({ success: true, data: { user, member } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: AuthRequest, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: "Logout failed" });
      }
      res.json({ success: true, data: { message: "Logged out successfully" } });
    });
  });

  app.post("/api/auth/mobile/register", authLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const userData = schema.insertUserSchema.parse(req.body);
      const { wardId, referralCode: referrerCode } = req.body;
      const normalizedEmail = userData.email.trim().toLowerCase();

      if (!wardId) {
        return res.status(400).json({ success: false, error: "Ward selection is required" });
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, normalizedEmail),
      });

      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await db
        .insert(schema.users)
        .values({
          ...userData,
          email: normalizedEmail,
          password: hashedPassword,
        })
        .returning();

      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      const memberId = `APC-${year}-NG-${random}`;
      const referralCode = `APC${userData.firstName
        .substring(0, 3)
        .toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      let referrerId: string | null = null;
      if (referrerCode) {
        const referrer = await db.query.members.findFirst({
          where: eq(schema.members.referralCode, referrerCode),
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      const [member] = await db
        .insert(schema.members)
        .values({
          userId: user.id,
          memberId,
          wardId,
          status: "pending",
          referralCode,
          referredBy: referrerId,
        })
        .returning();

      if (referrerId) {
        await db.insert(schema.referrals).values({
          referrerId,
          referredId: member.id,
          status: "pending",
          pointsEarned: 0,
        });
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      const hashedRefreshToken = await hashRefreshToken(refreshToken);

      await db.insert(schema.refreshTokens).values({
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      const { password: _, ...userWithoutPassword } = user;

      await logAudit({
        userId: user.id,
        memberId: member.id,
        action: AuditActions.REGISTER,
        details: { email: user.email, channel: "mobile" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status: "success",
      });

      return res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: userWithoutPassword,
          member,
        },
      });
    } catch (error) {
      console.error("Mobile registration error:", error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      });
    }
  });

  app.post("/api/auth/mobile/login", async (req: AuthRequest, res: Response) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = String(email || "").trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, normalizedEmail)
      });

      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: "Invalid email or password" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, user.id)
      });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      const hashedRefreshToken = await hashRefreshToken(refreshToken);

      await db.insert(schema.refreshTokens).values({
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: userWithoutPassword,
          member,
        },
      });
    } catch (error) {
      console.error("Mobile login error:", error);
      return res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  app.post("/api/auth/mobile/refresh", async (req: AuthRequest, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ success: false, error: "Refresh token is required" });
      }

      const userId = verifyRefreshToken(refreshToken);

      const userTokens = await db.query.refreshTokens.findMany({
        where: and(
          eq(schema.refreshTokens.userId, userId),
          sql`${schema.refreshTokens.revokedAt} IS NULL`
        ),
      });

      let storedToken = null;
      for (const token of userTokens) {
        const isMatch = await verifyRefreshTokenHash(refreshToken, token.token);
        if (isMatch) {
          storedToken = token;
          break;
        }
      }

      if (!storedToken) {
        return res.status(401).json({ success: false, error: "Invalid refresh token" });
      }

      if (new Date() > storedToken.expiresAt) {
        return res.status(401).json({ success: false, error: "Refresh token expired" });
      }

      await db.update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.id, storedToken.id));

      const newAccessToken = generateAccessToken(userId);
      const newRefreshToken = generateRefreshToken(userId);
      const hashedNewRefreshToken = await hashRefreshToken(newRefreshToken);

      await db.insert(schema.refreshTokens).values({
        userId,
        token: hashedNewRefreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      return res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      return res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : "Token refresh failed",
      });
    }
  });

  app.post("/api/auth/mobile/logout", async (req: AuthRequest, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ success: false, error: "Refresh token is required" });
      }

      const userId = verifyRefreshToken(refreshToken);

      const userTokens = await db.query.refreshTokens.findMany({
        where: and(
          eq(schema.refreshTokens.userId, userId),
          sql`${schema.refreshTokens.revokedAt} IS NULL`
        ),
      });

      let storedToken = null;
      for (const token of userTokens) {
        const isMatch = await verifyRefreshTokenHash(refreshToken, token.token);
        if (isMatch) {
          storedToken = token;
          break;
        }
      }

      if (storedToken) {
        await db.update(schema.refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(schema.refreshTokens.id, storedToken.id));
      }

      return res.json({
        success: true,
        data: { message: "Logged out successfully" },
      });
    } catch (error) {
      console.error("Mobile logout error:", error);
      return res.status(500).json({ success: false, error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: {
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          }
        }
      });

      const { password: _password, ...safeUser } = req.user!;
      res.json({ success: true, data: { user: safeUser, member } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch user data" });
    }
  });

  const normalizeRelatedValue = <T>(value: T | T[] | null | undefined): T | null => {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  };

  const sanitizeUser = (user: UserType | null) => {
    if (!user) {
      return null;
    }
    const { password: _password, ...safeUser } = user;
    return safeUser;
  };

  const getProfileByUserId = async (userId: string) => {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, userId),
      with: {
        user: true,
        ward: {
          with: {
            lga: {
              with: {
                state: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      return null;
    }

    const memberUser = normalizeRelatedValue(member.user) as UserType | null;
    const { user: _memberUser, ...memberWithoutUser } = member as any;

    return {
      user: sanitizeUser(memberUser),
      member: memberWithoutUser,
    };
  };

  app.get("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await getProfileByUserId(req.user!.id);
      if (!profile) {
        return res.status(404).json({ success: false, error: "Member profile not found" });
      }
      return res.json({ success: true, data: profile });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const payload = z.object({
        firstName: z.string().trim().min(1).max(120).optional(),
        lastName: z.string().trim().min(1).max(120).optional(),
        phone: z.string().trim().max(30).nullable().optional(),
      }).parse(req.body);

      const updateData: { firstName?: string; lastName?: string; phone?: string | null } = {};
      if (payload.firstName !== undefined) updateData.firstName = payload.firstName;
      if (payload.lastName !== undefined) updateData.lastName = payload.lastName;
      if (payload.phone !== undefined) updateData.phone = payload.phone;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: "No profile fields provided" });
      }

      await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, req.user!.id));

      const profile = await getProfileByUserId(req.user!.id);
      if (!profile) {
        return res.status(404).json({ success: false, error: "Member profile not found" });
      }

      return res.json({ success: true, data: profile });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  });

  app.get("/api/profile/badges", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const earnedBadges = await db.query.userBadges.findMany({
        where: eq(schema.userBadges.memberId, member.id),
        orderBy: desc(schema.userBadges.earnedAt),
        with: { badge: true },
      });

      const badges = earnedBadges.map((entry) => ({
        id: entry.badge.id,
        name: entry.badge.name,
        description: entry.badge.description,
        icon: entry.badge.icon,
        earnedAt: entry.earnedAt,
      }));

      return res.json({ success: true, data: badges });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to fetch badges" });
    }
  });

  app.get("/api/locations/states", async (req: Request, res: Response) => {
    try {
      const states = await db.query.states.findMany({
        orderBy: asc(schema.states.name)
      });
      res.json({ success: true, data: states });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch states" });
    }
  });

  app.get("/api/locations/states/:id/lgas", async (req: Request, res: Response) => {
    try {
      const lgas = await db.query.lgas.findMany({
        where: eq(schema.lgas.stateId, req.params.id),
        orderBy: asc(schema.lgas.name)
      });
      res.json({ success: true, data: lgas });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch LGAs" });
    }
  });

  app.get("/api/analytics/state/:stateId/lgas", async (req: Request, res: Response) => {
    try {
      const { stateId } = req.params;

      const lgaStats = await db.execute(sql`
        SELECT 
          l.id,
          l.name,
          l.code,
          COALESCE(member_counts.member_count, 0)::int AS "memberCount",
          COALESCE(member_counts.active_count, 0)::int AS "activeMembers",
          COALESCE(ward_counts.ward_count, 0)::int AS "wardCount",
          COALESCE(pu_counts.pu_count, 0)::int AS "pollingUnitsCount",
          COALESCE(event_counts.event_count, 0)::int AS "eventsCount"
        FROM lgas l
        LEFT JOIN (
          SELECT w.lga_id,
            COUNT(DISTINCT m.id) AS member_count,
            COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) AS active_count
          FROM wards w
          LEFT JOIN members m ON m.ward_id = w.id
          GROUP BY w.lga_id
        ) member_counts ON member_counts.lga_id = l.id
        LEFT JOIN (
          SELECT lga_id, COUNT(*) AS ward_count
          FROM wards
          GROUP BY lga_id
        ) ward_counts ON ward_counts.lga_id = l.id
        LEFT JOIN (
          SELECT w.lga_id, COUNT(DISTINCT pu.id) AS pu_count
          FROM wards w
          LEFT JOIN polling_units pu ON pu.ward_id = w.id
          GROUP BY w.lga_id
        ) pu_counts ON pu_counts.lga_id = l.id
        LEFT JOIN (
          SELECT e.lga_id, COUNT(*) AS event_count
          FROM events e
          WHERE e.lga_id IS NOT NULL
          GROUP BY e.lga_id
        ) event_counts ON event_counts.lga_id = l.id
        WHERE l.state_id = ${stateId}
        ORDER BY l.name ASC
      `);

      res.json({ success: true, data: lgaStats.rows });
    } catch (error) {
      console.error("State LGA analytics error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch LGA analytics" });
    }
  });

  app.get("/api/locations/lgas/:id/wards", async (req: Request, res: Response) => {
    try {
      const wards = await db.query.wards.findMany({
        where: eq(schema.wards.lgaId, req.params.id),
        orderBy: asc(schema.wards.wardNumber)
      });
      res.json({ success: true, data: wards });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch wards" });
    }
  });

  // Backward-compatible location routes used by the mobile app.
  app.get("/api/states", async (_req: Request, res: Response) => {
    try {
      const states = await db.query.states.findMany({
        orderBy: asc(schema.states.name),
      });
      return res.json({ success: true, data: states });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to fetch states" });
    }
  });

  app.get("/api/lgas", async (req: Request, res: Response) => {
    try {
      const stateId = req.query.stateId as string | undefined;
      if (!stateId) {
        return res.status(400).json({ success: false, error: "stateId is required" });
      }

      const lgas = await db.query.lgas.findMany({
        where: eq(schema.lgas.stateId, stateId),
        orderBy: asc(schema.lgas.name),
      });

      return res.json({ success: true, data: lgas });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to fetch LGAs" });
    }
  });

  app.get("/api/wards", async (req: Request, res: Response) => {
    try {
      const lgaId = req.query.lgaId as string | undefined;
      if (!lgaId) {
        return res.status(400).json({ success: false, error: "lgaId is required" });
      }

      const wards = await db.query.wards.findMany({
        where: eq(schema.wards.lgaId, lgaId),
        orderBy: asc(schema.wards.wardNumber),
      });

      return res.json({ success: true, data: wards });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to fetch wards" });
    }
  });

  // ============================================================================
  // ELECTORAL SYSTEM ROUTES
  // ============================================================================

  // Get all senatorial districts (optionally filter by state)
  app.get("/api/electoral/senatorial-districts", async (req: Request, res: Response) => {
    try {
      const { stateId } = req.query;
      
      let districts;
      if (stateId) {
        districts = await db.query.senatorialDistricts.findMany({
          where: eq(schema.senatorialDistricts.stateId, stateId as string),
          with: { state: true },
          orderBy: asc(schema.senatorialDistricts.code)
        });
      } else {
        districts = await db.query.senatorialDistricts.findMany({
          with: { state: true },
          orderBy: asc(schema.senatorialDistricts.code)
        });
      }
      
      res.json({ success: true, data: districts });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch senatorial districts" });
    }
  });

  // Get electoral statistics
  app.get("/api/electoral/stats", async (req: Request, res: Response) => {
    try {
      const { year } = req.query;
      
      let stats;
      if (year) {
        stats = await db.query.electoralStats.findFirst({
          where: eq(schema.electoralStats.year, parseInt(year as string)),
        });
      } else {
        // Get the most recent year
        stats = await db.query.electoralStats.findFirst({
          orderBy: desc(schema.electoralStats.year)
        });
      }
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch electoral statistics" });
    }
  });

  // Get regional electoral statistics
  app.get("/api/electoral/regional-stats", async (req: Request, res: Response) => {
    try {
      const { year } = req.query;
      
      let regionalStats;
      if (year) {
        // Get stats for specific year
        const stats = await db.query.electoralStats.findFirst({
          where: eq(schema.electoralStats.year, parseInt(year as string)),
        });
        
        if (stats) {
          regionalStats = await db.query.regionalElectoralStats.findMany({
            where: eq(schema.regionalElectoralStats.statsId, stats.id),
            orderBy: desc(schema.regionalElectoralStats.voters)
          });
        }
      } else {
        // Get most recent regional stats
        const latestStats = await db.query.electoralStats.findFirst({
          orderBy: desc(schema.electoralStats.year)
        });
        
        if (latestStats) {
          regionalStats = await db.query.regionalElectoralStats.findMany({
            where: eq(schema.regionalElectoralStats.statsId, latestStats.id),
            orderBy: desc(schema.regionalElectoralStats.voters)
          });
        }
      }
      
      res.json({ success: true, data: regionalStats || [] });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch regional electoral statistics" });
    }
  });

  // ============================================================================
  // END ELECTORAL SYSTEM ROUTES
  // ============================================================================

  app.get("/api/members", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { wardId, lgaId, stateId } = req.query;
      let members;

      if (wardId) {
        members = await db.query.members.findMany({
          where: eq(schema.members.wardId, wardId as string),
          with: { user: true, ward: true }
        });
      } else {
        members = await db.query.members.findMany({
          with: { user: true, ward: { with: { lga: { with: { state: true } } } } }
        });
      }

      res.json({ success: true, data: members });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch members" });
    }
  });

  // Get current member with referral code (must be before /api/members/:id)
  app.get("/api/members/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: {
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      res.json({ success: true, data: member });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch member" });
    }
  });

  // Get current member's points (must be before /api/members/:id)
  app.get("/api/members/points", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const pointsBreakdown = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${schema.userPoints.amount}), 0)`,
        })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id));

      res.json({ success: true, data: { totalPoints: pointsBreakdown[0]?.totalPoints || 0 } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch points" });
    }
  });

  // ===================================
  // FLUTTERWAVE INTEGRATION - POINTS REDEMPTION
  // ===================================
  
  // Flutterwave service functions
  async function purchaseAirtimeViaFlutterwave(phone: string, amount: number, reference: string) {
    const response = await fetch('https://api.flutterwave.com/v3/bills', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country: "NG",
        customer: phone,
        amount: amount,
        recurrence: "ONCE",
        type: "AIRTIME",
        reference: reference
      })
    });
    return response.json();
  }

  async function checkFlutterwaveStatus(reference: string) {
    const response = await fetch(`https://api.flutterwave.com/v3/bills/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
      }
    });
    return response.json();
  }

  // Get conversion settings
  app.get("/api/rewards/conversion-settings", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await db.query.pointConversionSettings.findMany({
        where: eq(schema.pointConversionSettings.isActive, true)
      });
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch conversion settings" });
    }
  });

  // Calculate conversion quote
  app.post("/api/rewards/quote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { productType, carrier, nairaValue } = req.body;

      const setting = await db.query.pointConversionSettings.findFirst({
        where: and(
          eq(schema.pointConversionSettings.productType, productType),
          eq(schema.pointConversionSettings.isActive, true)
        )
      });

      if (!setting) {
        return res.status(404).json({ success: false, error: "Conversion not available for this product type" });
      }

      // Calculate points needed
      let rate = parseFloat(setting.baseRate as unknown as string);
      
      // Check for carrier-specific override
      if (setting.carrierOverrides && carrier in setting.carrierOverrides) {
        rate = setting.carrierOverrides[carrier as keyof typeof setting.carrierOverrides] as unknown as number;
      }

      const pointsNeeded = Math.ceil(nairaValue * rate);

      // Validate min/max
      if (pointsNeeded < (setting.minPoints || 0)) {
        return res.status(400).json({ 
          success: false, 
          error: `Minimum ${setting.minPoints} points required` 
        });
      }

      if (pointsNeeded > (setting.maxPoints || 10000)) {
        return res.status(400).json({ 
          success: false, 
          error: `Maximum ${setting.maxPoints} points allowed` 
        });
      }

      res.json({ 
        success: true, 
        data: { 
          pointsNeeded, 
          nairaValue, 
          rate,
          minPoints: setting.minPoints,
          maxPoints: setting.maxPoints
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to calculate quote" });
    }
  });

  // Redeem points for airtime/data
  app.post("/api/rewards/redeem", requireAuth, apiLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const { phoneNumber, carrier, productType, nairaValue } = req.body;

      // Validate Nigerian phone number
      const phoneRegex = /^0[789][01]\d{8}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid Nigerian phone number format" 
        });
      }

      // Get member
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Check rate limiting - max 5 redemptions per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRedemptions = await db.query.pointRedemptions.findMany({
        where: and(
          eq(schema.pointRedemptions.memberId, member.id),
          gte(schema.pointRedemptions.createdAt, today)
        )
      });

      if (todayRedemptions.length >= 5) {
        return res.status(429).json({ 
          success: false, 
          error: "Maximum 5 redemptions per day allowed" 
        });
      }

      // Get conversion setting
      const setting = await db.query.pointConversionSettings.findFirst({
        where: and(
          eq(schema.pointConversionSettings.productType, productType),
          eq(schema.pointConversionSettings.isActive, true)
        )
      });

      if (!setting) {
        return res.status(404).json({ success: false, error: "Conversion not available" });
      }

      // Calculate points needed
      let rate = parseFloat(setting.baseRate as unknown as string);
      if (setting.carrierOverrides && carrier in setting.carrierOverrides) {
        rate = setting.carrierOverrides[carrier as keyof typeof setting.carrierOverrides] as unknown as number;
      }
      const pointsNeeded = Math.ceil(nairaValue * rate);

      // Check if user has sufficient points
      const userPointsData = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${schema.userPoints.amount}), 0)`,
        })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id));

      const totalPoints = userPointsData[0]?.totalPoints || 0;

      if (totalPoints < pointsNeeded) {
        return res.status(400).json({ 
          success: false, 
          error: "Insufficient points" 
        });
      }

      // Generate unique reference
      const timestamp = Date.now();
      const reference = `RDM-${member.id.slice(0, 8)}-${timestamp}`;

      // Create redemption record
      const [redemption] = await db.insert(schema.pointRedemptions).values({
        memberId: member.id,
        phoneNumber,
        carrier,
        productType,
        nairaValue: nairaValue.toString(),
        pointsDebited: pointsNeeded,
        flutterwaveReference: reference,
        status: "pending"
      }).returning();

      try {
        // Call Flutterwave API
        const flwResponse = await purchaseAirtimeViaFlutterwave(phoneNumber, nairaValue, reference);

        if (flwResponse.status === "success") {
          // Debit points
          const pointLedger = new PointLedgerService();
          await pointLedger.deductPoints({
            memberId: member.id,
            points: pointsNeeded,
            transactionType: "spend",
            source: "redemption",
            referenceType: "redemption",
            referenceId: redemption.id,
            metadata: { description: "Airtime redemption", reference, phoneNumber, carrier, productType, nairaValue }
          });

          // Update redemption status
          await db.update(schema.pointRedemptions)
            .set({ 
              status: "completed",
              completedAt: new Date(),
              metadata: { flwResponse }
            })
            .where(eq(schema.pointRedemptions.id, redemption.id));

          await logAudit({
            memberId: member.id,
            action: AuditActions.REWARD_REDEEM,
            details: { description: `Redeemed ${pointsNeeded} points for ${nairaValue} NGN ${productType} to ${phoneNumber}`, redemptionId: redemption.id, reference },
            status: "success"
          });

          res.json({ 
            success: true, 
            data: { 
              redemption: { ...redemption, status: "completed" },
              reference,
              message: `Successfully redeemed ${pointsNeeded} points for ${nairaValue} NGN ${productType}` 
            } 
          });
        } else {
          // Update redemption with error
          await db.update(schema.pointRedemptions)
            .set({ 
              status: "failed",
              errorMessage: flwResponse.message || "Transaction failed"
            })
            .where(eq(schema.pointRedemptions.id, redemption.id));

          res.status(400).json({ 
            success: false, 
            error: flwResponse.message || "Transaction failed" 
          });
        }
      } catch (error: any) {
        // Update redemption with error
        await db.update(schema.pointRedemptions)
          .set({ 
            status: "failed",
            errorMessage: error.message || "Internal error"
          })
          .where(eq(schema.pointRedemptions.id, redemption.id));

        throw error;
      }
    } catch (error) {
      console.error("Redemption error:", error);
      res.status(500).json({ success: false, error: "Failed to process redemption" });
    }
  });

  // Get redemption history
  app.get("/api/rewards/redemptions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const redemptions = await db.query.pointRedemptions.findMany({
        where: eq(schema.pointRedemptions.memberId, member.id),
        orderBy: [desc(schema.pointRedemptions.createdAt)]
      });

      res.json({ success: true, data: redemptions });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch redemption history" });
    }
  });

  // Admin: Get all conversion settings
  app.get("/api/admin/conversion-settings", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const settings = await db.query.pointConversionSettings.findMany();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch settings" });
    }
  });

  // Admin: Update conversion settings
  app.post("/api/admin/conversion-settings", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { productType, baseRate, minPoints, maxPoints, carrierOverrides, isActive } = req.body;

      // Check if setting exists
      const existing = await db.query.pointConversionSettings.findFirst({
        where: eq(schema.pointConversionSettings.productType, productType)
      });

      let result;
      if (existing) {
        // Update existing
        [result] = await db.update(schema.pointConversionSettings)
          .set({ 
            baseRate: baseRate.toString(), 
            minPoints, 
            maxPoints, 
            carrierOverrides, 
            isActive,
            updatedAt: new Date()
          })
          .where(eq(schema.pointConversionSettings.id, existing.id))
          .returning();
      } else {
        // Create new
        [result] = await db.insert(schema.pointConversionSettings).values({
          productType,
          baseRate: baseRate.toString(),
          minPoints,
          maxPoints,
          carrierOverrides,
          isActive
        }).returning();
      }

      await logAudit({
        userId: req.user!.id,
        action: AuditActions.ADMIN_UPDATE,
        details: { description: `Updated conversion settings for ${productType}`, settingId: result.id },
        status: "success"
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ success: false, error: "Failed to update settings" });
    }
  });

  // Flutterwave webhook (for status updates)
  app.post("/api/webhooks/flutterwave", async (req: Request, res: Response) => {
    try {
      const { reference, status } = req.body;

      if (reference && status) {
        const redemption = await db.query.pointRedemptions.findFirst({
          where: eq(schema.pointRedemptions.flutterwaveReference, reference)
        });

        if (redemption && redemption.status === "pending") {
          await db.update(schema.pointRedemptions)
            .set({ 
              status: status === "successful" ? "completed" : "failed",
              completedAt: status === "successful" ? new Date() : undefined,
              metadata: { webhookData: req.body }
            })
            .where(eq(schema.pointRedemptions.id, redemption.id));
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ success: false, error: "Webhook processing failed" });
    }
  });

  app.get("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: {
          user: true,
          ward: {
            with: {
              lga: { with: { state: true } }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      res.json({ success: true, data: member });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch member" });
    }
  });

  app.patch("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      if (member.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const [updated] = await db.update(schema.members)
        .set(req.body)
        .where(eq(schema.members.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update member" });
    }
  });

  // MEMBER ACCOUNT MANAGEMENT ROUTES
  // =================================
  // Admin-only routes for managing member accounts

  const memberActionReasonSchema = z.object({
    reason: z.string().min(1, "Reason is required")
  });

  app.post("/api/members/:id/suspend", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = memberActionReasonSchema.parse(req.body);
      
      await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "suspended",
        changedBy: req.user!.id,
        reason,
        ipAddress: req.antiCheat?.ipAddress || req.ip,
        userAgent: req.antiCheat?.userAgent || req.headers["user-agent"]
      });

      res.json({ success: true, message: "Member account suspended successfully" });
    } catch (error: any) {
      console.error("[POST /api/members/:id/suspend] Error:", error);
      res.status(error.message === "Member not found" ? 404 : 500).json({ 
        success: false, 
        error: error.message || "Failed to suspend member" 
      });
    }
  });

  app.post("/api/members/:id/activate", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "active",
        changedBy: req.user!.id,
        reason: "Account activated by admin",
        ipAddress: req.antiCheat?.ipAddress || req.ip,
        userAgent: req.antiCheat?.userAgent || req.headers["user-agent"]
      });

      res.json({ success: true, message: "Member account activated successfully" });
    } catch (error: any) {
      console.error("[POST /api/members/:id/activate] Error:", error);
      res.status(error.message === "Member not found" ? 404 : 500).json({ 
        success: false, 
        error: error.message || "Failed to activate member" 
      });
    }
  });

  app.post("/api/members/:id/delete", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = memberActionReasonSchema.parse(req.body);
      
      await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "deleted",
        changedBy: req.user!.id,
        reason,
        ipAddress: req.antiCheat?.ipAddress || req.ip,
        userAgent: req.antiCheat?.userAgent || req.headers["user-agent"]
      });

      res.json({ success: true, message: "Member account deleted successfully" });
    } catch (error: any) {
      console.error("[POST /api/members/:id/delete] Error:", error);
      res.status(error.message === "Member not found" ? 404 : 500).json({ 
        success: false, 
        error: error.message || "Failed to delete member" 
      });
    }
  });

  app.post("/api/members/:id/restore", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "active",
        changedBy: req.user!.id,
        reason: "Account restored by admin",
        ipAddress: req.antiCheat?.ipAddress || req.ip,
        userAgent: req.antiCheat?.userAgent || req.headers["user-agent"]
      });

      res.json({ success: true, message: "Member account restored successfully" });
    } catch (error: any) {
      console.error("[POST /api/members/:id/restore] Error:", error);
      res.status(error.message === "Member not found" ? 404 : 500).json({ 
        success: false, 
        error: error.message || "Failed to restore member" 
      });
    }
  });

  app.post("/api/members/:id/reset-password", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const result = await memberAccountService.initiateAdminPasswordReset(
        member.userId,
        req.user!.id,
        "email"
      );

      res.json({ 
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("[POST /api/members/:id/reset-password] Error:", error);
      res.status(error.message === "User not found" ? 404 : 500).json({ 
        success: false, 
        error: error.message || "Failed to reset password" 
      });
    }
  });

  // NIN VERIFICATION ENDPOINTS
  // ==========================
  const verifyNinForMember = async (
    targetMemberId: string,
    actorUserId: string,
    actorRole: string | null | undefined,
    nin: string,
    dateOfBirth: string
  ) => {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, targetMemberId),
      with: { user: true },
    });

    if (!member) {
      return {
        status: 404,
        body: { success: false, error: "Member not found" },
      };
    }

    if (member.userId !== actorUserId && actorRole !== "admin") {
      return {
        status: 403,
        body: { success: false, error: "Forbidden" },
      };
    }

    if (member.ninVerified) {
      return {
        status: 200,
        body: {
          success: true,
          data: {
            verified: true,
            message: "NIN already verified",
            verifiedAt: member.ninVerifiedAt,
          },
        },
      };
    }

    const MAX_VERIFICATION_ATTEMPTS = 10;
    if ((member.ninVerificationAttempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        status: 429,
        body: {
          success: false,
          error: `Maximum verification attempts (${MAX_VERIFICATION_ATTEMPTS}) exceeded. Please contact support.`,
        },
      };
    }

    const ninStatus = await ninService.checkNINStatus(nin);
    if (ninStatus.exists && ninStatus.memberId !== member.memberId) {
      return {
        status: 400,
        body: {
          success: false,
          error: "This NIN is already registered to another member",
        },
      };
    }

    const relatedUser = Array.isArray(member.user) ? member.user[0] : member.user;
    const verificationResult = await ninService.verifyNIN({
      nin,
      firstName: relatedUser?.firstName || "",
      lastName: relatedUser?.lastName || "",
      dateOfBirth: dateOfBirth || "",
    });

    const attempts = (member.ninVerificationAttempts || 0) + 1;
    if (verificationResult.success && verificationResult.data?.verified) {
      const [updated] = await db
        .update(schema.members)
        .set({
          nin: verificationResult.data.nin,
          ninVerified: true,
          ninVerifiedAt: new Date(),
          ninVerificationAttempts: attempts,
          status: "active",
        })
        .where(eq(schema.members.id, targetMemberId))
        .returning();

      return {
        status: 200,
        body: {
          success: true,
          data: {
            verified: true,
            member: updated,
            message: verificationResult.message,
          },
        },
      };
    }

    await db
      .update(schema.members)
      .set({
        ninVerificationAttempts: attempts,
      })
      .where(eq(schema.members.id, targetMemberId));

    const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - attempts;
    return {
      status: 400,
      body: {
        success: false,
        error: verificationResult.message,
        code: verificationResult.code,
        remainingAttempts,
      },
    };
  };

  app.post("/api/members/:id/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const payload = z.object({
        nin: z.string().trim().length(11),
        dateOfBirth: z.string().trim().min(1),
      }).parse(req.body);

      const result = await verifyNinForMember(
        req.params.id,
        req.user!.id,
        req.user!.role,
        payload.nin,
        payload.dateOfBirth
      );

      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid NIN verification payload",
          details: error.issues,
        });
      }
      console.error("NIN verification error:", error);
      return res.status(500).json({
        success: false,
        error: "NIN verification failed. Please try again later.",
      });
    }
  });

  app.post("/api/profile/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const payload = z.object({
        nin: z.string().trim().length(11),
        dateOfBirth: z.string().trim().min(1),
      }).parse(req.body);

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const result = await verifyNinForMember(
        member.id,
        req.user!.id,
        req.user!.role,
        payload.nin,
        payload.dateOfBirth
      );

      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid NIN verification payload",
          details: error.issues,
        });
      }
      console.error("Profile NIN verification error:", error);
      return res.status(500).json({
        success: false,
        error: "NIN verification failed. Please try again later.",
      });
    }
  });

  app.get("/api/members/:id/qr-code", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      const qrData = {
        memberId: member.memberId,
        name: `${user?.firstName} ${user?.lastName}`,
        wardId: member.wardId
      };

      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      res.json({ success: true, data: { qrCode } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to generate QR code" });
    }
  });

  // Get ID card data for a member
  app.get("/api/members/:id/id-card", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: {
          user: true,
          ward: {
            with: {
              lga: {
                with: {
                  state: true
                }
              }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Get or create ID card record
      let idCard = await db.query.memberIdCards.findFirst({
        where: and(
          eq(schema.memberIdCards.memberId, member.id),
          sql`${schema.memberIdCards.revokedAt} IS NULL`
        ),
        orderBy: desc(schema.memberIdCards.lastGeneratedAt),
      });

      // Create ID card if it doesn't exist
      if (!idCard) {
        const nonce = crypto.randomBytes(32).toString('hex');
        [idCard] = await db.insert(schema.memberIdCards).values({
          memberId: member.id,
          signatureNonce: nonce,
          generatedByUserId: req.user!.id,
        }).returning();
      }

      // Generate signed token
      const token = generateIdCardToken(member.id, idCard.signatureNonce);

      res.json({
        success: true,
        data: {
          member,
          token,
          idCard
        }
      });
    } catch (error) {
      console.error("Error fetching ID card:", error);
      res.status(500).json({ success: false, error: "Failed to fetch ID card" });
    }
  });

  // Regenerate ID card with new nonce (admin only)
  app.post("/api/members/:id/id-card/regenerate", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Revoke old ID cards
      await db.update(schema.memberIdCards)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(schema.memberIdCards.memberId, member.id),
          sql`${schema.memberIdCards.revokedAt} IS NULL`
        ));

      // Create new ID card
      const nonce = crypto.randomBytes(32).toString('hex');
      const [idCard] = await db.insert(schema.memberIdCards).values({
        memberId: member.id,
        signatureNonce: nonce,
        generatedByUserId: req.user!.id,
      }).returning();

      const token = generateIdCardToken(member.id, idCard.signatureNonce);

      res.json({
        success: true,
        data: {
          idCard,
          token,
          message: "ID card regenerated successfully"
        }
      });
    } catch (error) {
      console.error("Error regenerating ID card:", error);
      res.status(500).json({ success: false, error: "Failed to regenerate ID card" });
    }
  });

  // ============================================================================
  // OBJECT STORAGE ENDPOINTS
  // ============================================================================
  // Reference: javascript_object_storage blueprint for protected file uploading

  // Serve objects with ACL check
  app.get("/objects/:objectPath(*)", async (req: AuthRequest, res: Response) => {
    const objectStorageService = ObjectStorageService.getInstance();
    console.log(`[GET /objects/*] ====== OBJECT RETRIEVAL REQUEST ======`);
    console.log(`[GET /objects/*] Requested path: ${req.path}`);
    console.log(`[GET /objects/*] Full URL: ${req.url}`);
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      console.log(`[GET /objects/*] Object found, streaming to client`);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error(`[GET /objects/*] Error accessing object:`, error);
      if (error instanceof ObjectNotFoundError) {
        console.log(`[GET /objects/*] Object not found (404)`);
        return res.sendStatus(404);
      }
      console.log(`[GET /objects/*] Internal server error (500)`);
      return res.sendStatus(500);
    }
  });

  // Get upload URL for profile photo
  app.post("/api/objects/upload", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      console.log(`[POST /api/objects/upload] Request from user: ${req.user?.email}`);
      const objectStorageService = ObjectStorageService.getInstance();
      const { uploadUrl, objectKey, method } = await objectStorageService.getObjectEntityUploadURL();
      console.log(`[POST /api/objects/upload] ====== UPLOAD PARAMETERS RESPONSE ======`);
      console.log(`[POST /api/objects/upload] Returning objectKey to frontend: ${objectKey}`);
      console.log(`[POST /api/objects/upload] Returning upload URL to frontend: ${uploadUrl}`);
      console.log(`[POST /api/objects/upload] Method: ${method}`);
      console.log(`[POST /api/objects/upload] ========================================`);
      res.json({ success: true, data: { url: uploadUrl, objectKey, method } });
    } catch (error) {
      console.error("[POST /api/objects/upload] Error generating upload URL:", error);
      res.status(500).json({ success: false, error: "Failed to generate upload URL" });
    }
  });

  // Update member profile photo after upload
  app.post("/api/members/profile-photo", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { objectKey } = req.body;

      console.log(`[POST /api/members/profile-photo] ====== PROFILE PHOTO UPDATE ======`);
      console.log(`[POST /api/members/profile-photo] User: ${req.user?.email}`);
      console.log(`[POST /api/members/profile-photo] Received objectKey: ${objectKey}`);

      if (!objectKey) {
        console.log(`[POST /api/members/profile-photo] ERROR: Missing objectKey`);
        return res.status(400).json({ success: false, error: "objectKey is required" });
      }

      if (!objectKey.startsWith("/objects/")) {
        console.log(`[POST /api/members/profile-photo] ERROR: Invalid objectKey format`);
        return res.status(400).json({ success: false, error: "Invalid objectKey format" });
      }

      // Get member for this user
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        console.log(`[POST /api/members/profile-photo] ERROR: Member not found`);
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      console.log(`[POST /api/members/profile-photo] Member ID: ${member.id}`);
      console.log(`[POST /api/members/profile-photo] Setting ACL policy for object...`);

      // Set ACL policy for the uploaded photo (public visibility for ID cards)
      const objectStorageService = ObjectStorageService.getInstance();
      await objectStorageService.setObjectKeyAclPolicy(
        objectKey,
        {
          owner: req.user!.id,
          visibility: "public",
        }
      );

      console.log(`[POST /api/members/profile-photo] ACL policy set successfully`);
      console.log(`[POST /api/members/profile-photo] Updating member record with photoUrl: ${objectKey}`);

      // Update member's photo URL with the objectKey
      const [updatedMember] = await db.update(schema.members)
        .set({ photoUrl: objectKey })
        .where(eq(schema.members.id, member.id))
        .returning();

      console.log(`[POST /api/members/profile-photo] Profile photo updated successfully`);
      console.log(`[POST /api/members/profile-photo] ====================================`);

      res.json({
        success: true,
        data: { member: updatedMember, photoUrl: objectKey }
      });
    } catch (error) {
      console.error("[POST /api/members/profile-photo] Error updating profile photo:", error);
      res.status(500).json({ success: false, error: "Failed to update profile photo" });
    }
  });

  // Verify ID card authenticity
  app.get("/api/id-card/verify/:memberId", async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.params;
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, error: "Token is required" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, memberId),
        with: {
          user: true,
          ward: {
            with: {
              lga: {
                with: {
                  state: true
                }
              }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const verificationResult = await verifyIdCardToken(memberId, token);

      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          error: verificationResult.error,
          verified: false
        });
      }

      res.json({
        success: true,
        verified: true,
        data: {
          memberId: member.memberId,
          name: `${member.user?.firstName} ${member.user?.lastName}`,
          status: member.status,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error verifying ID card:", error);
      res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

  // Get all referrals for current member
  app.get("/api/referrals/my-referrals", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const referrals = await db.query.referrals.findMany({
        where: eq(schema.referrals.referrerId, member.id),
        orderBy: desc(schema.referrals.createdAt),
        with: {
          referred: {
            with: {
              user: true
            }
          }
        }
      });

      res.json({ success: true, data: referrals });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch referrals" });
    }
  });

  app.get("/api/dues", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const dues = await db.query.membershipDues.findMany({
        where: eq(schema.membershipDues.memberId, member.id),
        orderBy: desc(schema.membershipDues.dueDate)
      });

      res.json({ success: true, data: dues });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dues" });
    }
  });

  app.post("/api/dues", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const duesData = schema.insertDuesSchema.parse({
        ...req.body,
        memberId: member.id
      });

      const [dues] = await db.insert(schema.membershipDues)
        .values(duesData)
        .returning();

      // SMS INTEGRATION POINT: Send dues reminder SMS to member
      // Uncomment the following code when ready to send dues reminder SMS:
      /*
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.user!.id)
      });

      if (user?.phone) {
        const dueDate = new Date(dues.dueDate).toLocaleDateString('en-NG', { 
          month: 'short', 
          day: 'numeric' 
        });
        await smsService.sendDuesReminderSMS(user.phone, {
          name: user.firstName,
          amount: `₦${Number(dues.amount) / 100}`,
          dueDate: dueDate
        });
      }
      */

      res.json({ success: true, data: dues });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create dues record" });
    }
  });

  app.post("/api/dues/checkout", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { amount } = req.body;
      const member_id = req.user!.id;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, member_id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const tx_ref = `dues_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const [payment] = await db.insert(schema.membershipDues).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        amount: String(amount),
        paymentStatus: "pending",
        paymentMethod: "flutterwave",
        dueDate: new Date(),
      }).returning();

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      
      // Initialize Flutterwave payment
      const flwPayload = {
        tx_ref,
        amount,
        currency: "NGN",
        redirect_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/dues/verify`,
        payment_options: "card,banktransfer,ussd,account",
        customer: {
          email: user?.email || "",
          name: `${user?.firstName} ${user?.lastName}`,
        },
        customizations: {
          title: "APC Connect - Membership Dues",
          description: "Membership dues payment",
          logo: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/logo.png`,
        },
        meta: {
          payment_id: payment.id,
          member_id: member.id,
          type: "membership_dues",
        },
      };

      const flwResponse = await fetch(`${FLW_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flwPayload),
      });

      const flwData = await flwResponse.json();

      if (flwData.status !== 'success') {
        throw new Error(flwData.message || "Failed to initialize payment");
      }

      // Update payment record with Flutterwave reference
      await db.update(schema.membershipDues)
        .set({ paystackReference: tx_ref })
        .where(eq(schema.membershipDues.id, payment.id));

      res.json({
        success: true,
        data: {
          authorization_url: flwData.data.link,
          access_code: flwData.data.link,
          reference: tx_ref,
        }
      });
    } catch (error) {
      console.error("Dues checkout error:", error);
      res.status(500).json({ success: false, error: "Failed to create checkout session" });
    }
  });

  app.post("/api/dues/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      // Verify with Flutterwave
      const flwVerifyResponse = await fetch(
        `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          },
        }
      );

      const verification = await flwVerifyResponse.json();

      if (verification.status === 'success' && verification.data.status === "successful") {
        // Find payment by Flutterwave reference
        const payment = await db.query.membershipDues.findFirst({
          where: eq(schema.membershipDues.paystackReference, reference)
        });

        if (!payment) {
          return res.status(404).json({ success: false, error: "Payment not found" });
        }

        await db.update(schema.membershipDues)
          .set({
            paymentStatus: "completed",
            paidAt: new Date(),
          })
          .where(eq(schema.membershipDues.id, payment.id));

        if (payment) {
          await db.update(schema.members)
            .set({ status: "active" })
            .where(eq(schema.members.id, payment.memberId));
        }

        res.json({ success: true, data: { payment } });
      } else {
        const payment = await db.query.membershipDues.findFirst({
          where: eq(schema.membershipDues.paystackReference, reference)
        });

        if (payment) {
          await db.update(schema.membershipDues)
            .set({ paymentStatus: "failed" })
            .where(eq(schema.membershipDues.id, payment.id));
        }

        res.status(400).json({ success: false, error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Dues verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  app.post("/api/flutterwave/webhook", async (req: Request, res: Response) => {
    try {
      const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
      const signature = req.headers["verif-hash"];

      if (!signature || signature !== secretHash) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const payload = req.body;

      if (payload.event === "charge.completed" && payload.data.status === "successful") {
        const tx_ref = payload.data.tx_ref;
        const meta = payload.data.meta;

        if (meta && meta.type === "membership_dues") {
          const payment = await db.query.membershipDues.findFirst({
            where: eq(schema.membershipDues.paystackReference, tx_ref)
          });
          
          if (payment) {
            await db.update(schema.membershipDues)
              .set({ paymentStatus: "completed", paidAt: new Date() })
              .where(eq(schema.membershipDues.id, payment.id));
          }
        } else if (meta && meta.donation_id) {
          const donation = await db.query.donations.findFirst({
            where: eq(schema.donations.paystackReference, tx_ref)
          });
          
          if (donation) {
            await db.update(schema.donations)
              .set({ paymentStatus: "completed" })
              .where(eq(schema.donations.id, donation.id));
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  app.get("/api/dues/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const history = await db.query.membershipDues.findMany({
        where: eq(schema.membershipDues.memberId, member.id),
        orderBy: desc(schema.membershipDues.createdAt)
      });

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch payment history" });
    }
  });

  // ============================================================================
  // RECURRING MEMBERSHIP DUES ENDPOINTS
  // ============================================================================

  // Get current recurring dues status
  app.get("/api/dues/recurring", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const recurringDues = await db.query.recurringMembershipDues.findFirst({
        where: eq(schema.recurringMembershipDues.memberId, member.id)
      });

      res.json({ success: true, data: recurringDues || null });
    } catch (error) {
      console.error("Get recurring dues error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch recurring dues" });
    }
  });

  // Setup recurring dues payment
  app.post("/api/dues/recurring/setup", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, frequency } = req.body;
      
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Check if already has active recurring dues
      const existing = await db.query.recurringMembershipDues.findFirst({
        where: and(
          eq(schema.recurringMembershipDues.memberId, member.id),
          eq(schema.recurringMembershipDues.status, "active")
        )
      });

      if (existing) {
        return res.status(400).json({ 
          success: false, 
          error: "Active recurring dues already exists. Cancel or pause first." 
        });
      }

      // Calculate next payment date based on frequency
      const nextDate = new Date();
      switch (frequency) {
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      
      // Initialize first payment with Flutterwave
      const flwResponse = await fetch(`${FLW_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: `DUES_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/dues/recurring/verify`,
          customer: {
            email: user?.email || "",
            name: `${user?.firstName} ${user?.lastName}`,
          },
          customizations: {
            title: 'APC Recurring Membership Dues',
            description: `${frequency} dues payment`,
          },
          meta: {
            member_id: member.id,
            type: "recurring_dues_setup",
            frequency,
            amount,
          },
        }),
      });

      const flwData = await flwResponse.json();

      if (flwData.status !== 'success') {
        throw new Error(flwData.message || 'Failed to initialize Flutterwave payment');
      }

      res.json({
        success: true,
        data: {
          authorization_url: flwData.data.link,
          reference: flwData.data.tx_ref,
        }
      });
    } catch (error) {
      console.error("Recurring dues setup error:", error);
      res.status(500).json({ success: false, error: "Failed to setup recurring dues" });
    }
  });

  // Verify recurring dues setup and save authorization
  app.post("/api/dues/recurring/verify", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { reference } = req.body;

      if (!reference) {
        return res.status(400).json({ success: false, error: "Payment reference is required" });
      }

      // Verify transaction with Flutterwave using verify_by_reference
      const verifyResponse = await fetch(`${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        },
      });

      const verification = await verifyResponse.json();

      if (verification.status !== 'success' || verification.data.status !== 'successful') {
        return res.status(400).json({ success: false, error: "Payment verification failed" });
      }

      const { meta, customer, amount, charged_amount } = verification.data;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Verify member ID matches
      if (meta.member_id !== member.id) {
        return res.status(403).json({ success: false, error: "Payment belongs to different member" });
      }

      // Calculate next payment date
      const nextDate = new Date();
      switch (meta.frequency) {
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Create or update recurring dues record with Flutterwave data
      const [recurringDues] = await db.insert(schema.recurringMembershipDues).values({
        memberId: member.id,
        amount: String(meta.amount),
        frequency: meta.frequency,
        status: "active",
        nextPaymentDate: nextDate,
        lastPaymentDate: new Date(),
        paystackAuthorizationCode: verification.data.id.toString(),
        paystackCustomerCode: customer.email || verification.data.tx_ref,
      }).returning();

      // Also create a dues payment record with Flutterwave reference
      await db.insert(schema.membershipDues).values({
        memberId: member.id,
        amount: String(meta.amount),
        paymentMethod: "flutterwave",
        paystackReference: verification.data.tx_ref,
        paymentStatus: "completed",
        dueDate: new Date(),
        paidAt: new Date(),
      });

      // Update member status to active
      await db.update(schema.members)
        .set({ status: "active" })
        .where(eq(schema.members.id, member.id));

      res.json({ success: true, data: recurringDues });

    } catch (error: any) {
      console.error("Recurring dues verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify recurring payment" });
    }
  });

  // Pause recurring dues
  app.patch("/api/dues/recurring/pause", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.recurringMembershipDues)
        .set({ status: "paused", updatedAt: new Date() })
        .where(and(
          eq(schema.recurringMembershipDues.memberId, member.id),
          eq(schema.recurringMembershipDues.status, "active")
        ));

      res.json({ success: true, message: "Recurring dues paused successfully" });
    } catch (error) {
      console.error("Pause recurring dues error:", error);
      res.status(500).json({ success: false, error: "Failed to pause recurring dues" });
    }
  });

  // Resume recurring dues
  app.patch("/api/dues/recurring/resume", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.recurringMembershipDues)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(
          eq(schema.recurringMembershipDues.memberId, member.id),
          eq(schema.recurringMembershipDues.status, "paused")
        ));

      res.json({ success: true, message: "Recurring dues resumed successfully" });
    } catch (error) {
      console.error("Resume recurring dues error:", error);
      res.status(500).json({ success: false, error: "Failed to resume recurring dues" });
    }
  });

  // Cancel recurring dues
  app.delete("/api/dues/recurring", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.recurringMembershipDues)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(schema.recurringMembershipDues.memberId, member.id));

      res.json({ success: true, message: "Recurring dues cancelled successfully" });
    } catch (error) {
      console.error("Cancel recurring dues error:", error);
      res.status(500).json({ success: false, error: "Failed to cancel recurring dues" });
    }
  });

  // ============================================================================
  // ADMIN DUES MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all members with their dues status (admin only)
  app.get("/api/admin/dues/all", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const members = await db.query.members.findMany({
        with: {
          user: true,
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          },
          membershipDues: {
            orderBy: desc(schema.membershipDues.createdAt),
            limit: 1
          },
          recurringMembershipDues: true
        }
      });

      const membersWithDuesStatus = members.map(member => {
        const latestDues = member.membershipDues[0];
        const recurringDues = member.recurringMembershipDues.find((rd: any) => rd.status !== "cancelled");
        
        return {
          ...member,
          latestDues,
          recurringDues,
          duesStatus: latestDues?.paymentStatus === "completed" ? "paid" : 
                       latestDues?.paymentStatus === "pending" ? "pending" : "none",
          hasRecurring: recurringDues?.status === "active"
        };
      });

      res.json({ success: true, data: membersWithDuesStatus });
    } catch (error) {
      console.error("Admin dues fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch members dues" });
    }
  });

  // Generate bulk dues for all active members (admin only)
  app.post("/api/admin/dues/generate", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { amount, dueDate } = req.body;

      if (!amount || !dueDate) {
        return res.status(400).json({ success: false, error: "Amount and due date are required" });
      }

      // Get all active members
      const members = await db.query.members.findMany({
        where: eq(schema.members.status, "active")
      });

      // Create dues records for all active members
      const duesRecords = members.map(member => ({
        memberId: member.id,
        amount: String(amount), // Store in naira, not kobo
        paymentStatus: "pending" as const,
        dueDate: new Date(dueDate),
        paymentMethod: null,
      }));

      await db.insert(schema.membershipDues).values(duesRecords);

      res.json({ 
        success: true, 
        message: `Generated dues for ${members.length} active members`,
        count: members.length 
      });
    } catch (error) {
      console.error("Generate bulk dues error:", error);
      res.status(500).json({ success: false, error: "Failed to generate bulk dues" });
    }
  });

  // Check and suspend members with overdue dues (admin only)
  app.post("/api/admin/dues/check-overdue", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date();
      
      // Find all pending dues that are overdue (due date < today and not paid)
      const overdueDues = await db.query.membershipDues.findMany({
        where: and(
          eq(schema.membershipDues.paymentStatus, "pending"),
          sql`${schema.membershipDues.dueDate} < ${today}`
        ),
        with: {
          member: true
        }
      });

      // Get unique member IDs with overdue dues
      const overdueMembers = new Map();
      overdueDues.forEach(dues => {
        if (!overdueMembers.has(dues.memberId)) {
          overdueMembers.set(dues.memberId, dues.member);
        }
      });

      // Update members with overdue dues to "expired" status
      // Only update if they don't have active recurring dues
      let suspendedCount = 0;
      for (const [memberId, member] of Array.from(overdueMembers)) {
        // Check if member has active recurring dues
        const recurringDues = await db.query.recurringMembershipDues.findFirst({
          where: and(
            eq(schema.recurringMembershipDues.memberId, memberId),
            eq(schema.recurringMembershipDues.status, "active")
          )
        });

        // Only suspend if no active recurring dues
        if (!recurringDues && member.status === "active") {
          await db.update(schema.members)
            .set({ status: "expired" })
            .where(eq(schema.members.id, memberId));
          suspendedCount++;
        }
      }

      res.json({
        success: true,
        message: `Suspended ${suspendedCount} members with overdue dues`,
        overdueDuesCount: overdueDues.length,
        suspendedMembersCount: suspendedCount
      });
    } catch (error) {
      console.error("Check overdue dues error:", error);
      res.status(500).json({ success: false, error: "Failed to check overdue dues" });
    }
  });

  // Seed administrative boundaries from Excel file (admin only)
  app.post("/api/admin/seed-boundaries", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      console.log("\n🌍 Admin triggered administrative boundaries seeding");
      
      // Run the seed script
      const stats = await seedAdminBoundaries();

      // Audit log
      if (req.user) {
        await logAudit({
          userId: req.user.id,
          action: AuditActions.ADMIN_SEED_BOUNDARIES,
          resourceType: "admin",
          resourceId: "boundaries-seed",
          details: stats,
          status: "success",
        });
      }

      res.json({
        success: true,
        message: "Administrative boundaries seeded successfully",
        data: stats,
      });
    } catch (error: any) {
      console.error("Seed boundaries error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to seed administrative boundaries",
        details: error.message 
      });
    }
  });

  app.get("/api/events", async (req: AuthRequest, res: Response) => {
    try {
      const categoryQuery = typeof req.query.category === "string" ? req.query.category : undefined;
      const normalizedCategory = categoryQuery?.trim().toLowerCase();
      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
      const stateId = typeof req.query.stateId === "string" ? req.query.stateId : undefined;
      const lgaId = typeof req.query.lgaId === "string" ? req.query.lgaId : undefined;
      const wardId = typeof req.query.wardId === "string" ? req.query.wardId : undefined;

      const locationConditions: any[] = [];
      if (stateId) locationConditions.push(eq(schema.events.stateId, stateId));
      if (lgaId) locationConditions.push(eq(schema.events.lgaId, lgaId));
      if (wardId) locationConditions.push(eq(schema.events.wardId, wardId));

      const allEvents = await db.query.events.findMany({
        where: locationConditions.length > 0 ? and(...locationConditions) : undefined,
        orderBy: desc(schema.events.date),
      });

      const filteredEvents = normalizedCategory
        ? allEvents.filter((event) => {
            const normalizedEventCategory = event.category
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_");
            return normalizedEventCategory === normalizedCategory;
          })
        : allEvents;

      const events = limit && limit > 0 ? filteredEvents.slice(0, limit) : filteredEvents;
      const eventIds = events.map((event) => event.id);

      const attendeeCounts = eventIds.length > 0
        ? await db
            .select({
              eventId: schema.eventRsvps.eventId,
              count: sql<number>`COUNT(*)`,
            })
            .from(schema.eventRsvps)
            .where(
              and(
                inArray(schema.eventRsvps.eventId, eventIds),
                eq(schema.eventRsvps.status, "confirmed")
              )
            )
            .groupBy(schema.eventRsvps.eventId)
        : [];

      const attendeeCountMap = new Map(attendeeCounts.map((entry) => [entry.eventId, Number(entry.count) || 0]));

      let memberRsvps: Array<typeof schema.eventRsvps.$inferSelect> = [];
      if (req.user && eventIds.length > 0) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
        });

        if (member) {
          memberRsvps = await db.query.eventRsvps.findMany({
            where: and(
              eq(schema.eventRsvps.memberId, member.id),
              inArray(schema.eventRsvps.eventId, eventIds),
              eq(schema.eventRsvps.status, "confirmed")
            ),
          });
        }
      }

      const memberRsvpMap = new Map(memberRsvps.map((rsvp) => [rsvp.eventId, rsvp]));

      const data = events.map((event) => {
        const memberRsvp = memberRsvpMap.get(event.id);
        return {
          ...event,
          capacity: event.maxAttendees,
          currentAttendees: attendeeCountMap.get(event.id) || 0,
          hasRsvped: !!memberRsvp,
          rsvpId: memberRsvp?.id || null,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("Fetch events error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req: AuthRequest, res: Response) => {
    try {
      const event = await db.query.events.findFirst({
        where: eq(schema.events.id, req.params.id)
      });

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      const rsvpCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.eventRsvps)
        .where(and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.status, "confirmed")
        ));

      let memberRsvp: typeof schema.eventRsvps.$inferSelect | null = null;
      if (req.user) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
        });

        if (member) {
          memberRsvp = await db.query.eventRsvps.findFirst({
            where: and(
              eq(schema.eventRsvps.eventId, req.params.id),
              eq(schema.eventRsvps.memberId, member.id),
              eq(schema.eventRsvps.status, "confirmed")
            ),
          }) ?? null;
        }
      }

      res.json({
        success: true,
        data: {
          ...event,
          rsvpCount: Number(rsvpCount[0]?.count) || 0,
          capacity: event.maxAttendees,
          currentAttendees: Number(rsvpCount[0]?.count) || 0,
          hasRsvped: !!memberRsvp,
          rsvpId: memberRsvp?.id || null,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const eventData = schema.insertEventSchema.parse(req.body);
      const [event] = await db.insert(schema.events).values(eventData).returning();

      // EMAIL INTEGRATION POINT: Send event notification to all members
      // Uncomment the following code when ready to send event notifications:
      /*
      // Fetch all active members to send event notifications
      const members = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { user: true }
      });

      // Send event reminder emails to all members (consider using a job queue for large lists)
      for (const member of members) {
        const user = Array.isArray(member.user) ? member.user[0] : member.user;
        if (user?.email) {
          await emailService.sendEventReminderEmail(user.email, {
            firstName: user.firstName,
            eventTitle: event.title,
            eventDate: new Date(event.date).toLocaleDateString('en-NG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            eventTime: new Date(event.date).toLocaleTimeString('en-NG', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            eventLocation: event.location,
            eventDescription: event.description || ''
          });
        }
      }
      */

      // SMS INTEGRATION POINT: Send event reminder SMS to members with phone numbers
      // Uncomment the following code when ready to send event SMS notifications:
      /*
      // Fetch all active members with phone numbers for SMS notifications
      const members = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { user: true }
      });

      // Send event reminder SMS to members (consider using a job queue for large lists)
      // IMPORTANT: Implement rate limiting to prevent SMS spam
      for (const member of members) {
        const user = Array.isArray(member.user) ? member.user[0] : member.user;
        if (user?.phone) {
          const eventDate = new Date(event.date).toLocaleDateString('en-NG', { 
            month: 'short', 
            day: 'numeric' 
          });
          await smsService.sendEventReminderSMS(user.phone, {
            name: user.firstName,
            event: event.title,
            date: eventDate,
            location: event.location
          });
        }
      }
      */

      // ========================================================================
      // PUSH NOTIFICATION INTEGRATION POINT: Event Creation
      // ========================================================================
      // Send push notification to all members about the new event
      // Uncomment the following code when ready to send push notifications:
      /*
      import { pushService, NotificationTemplates } from "./push-service";
      
      // Get formatted event date for notification
      const eventDate = new Date(event.date).toLocaleDateString('en-NG', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Broadcast event notification to all members
      await pushService.broadcast(
        NotificationTemplates.eventReminder(
          event.title,
          eventDate,
          event.id
        )
      );
      
      // Alternative: Send to specific segment (e.g., only active members)
      // await pushService.sendToSegment(
      //   "verified-members",
      //   NotificationTemplates.eventReminder(event.title, eventDate, event.id)
      // );
      
      console.log(`Push notification sent for event: ${event.title}`);
      */

      res.json({ success: true, data: event });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [event] = await db.update(schema.events)
        .set(req.body)
        .where(eq(schema.events.id, req.params.id))
        .returning();

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      // ========================================================================
      // PUSH NOTIFICATION INTEGRATION POINT: Event Update
      // ========================================================================
      // Notify members who RSVPed to this event about the update
      // Uncomment the following code when ready to send push notifications:
      /*
      import { pushService, NotificationTemplates } from "./push-service";
      
      // Get all members who RSVPed to this event
      const rsvps = await db.query.eventRsvps.findMany({
        where: and(
          eq(schema.eventRsvps.eventId, event.id),
          eq(schema.eventRsvps.status, "confirmed")
        ),
        with: { member: true }
      });
      
      // Send notification to each RSVP'd member about the event update
      const userIds = rsvps.map(rsvp => rsvp.member.userId);
      
      const eventDate = new Date(event.date).toLocaleDateString('en-NG', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      await pushService.sendToMultiple(
        userIds,
        NotificationTemplates.eventReminder(
          `Updated: ${event.title}`,
          eventDate,
          event.id
        )
      );
      
      console.log(`Push notification sent to ${userIds.length} members about event update`);
      */

      res.json({ success: true, data: event });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.events).where(eq(schema.events.id, req.params.id));
      res.json({ success: true, data: { message: "Event deleted" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.eventRsvps.findFirst({
        where: and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.memberId, member.id)
        )
      });

      if (existing) {
        const [updated] = await db.update(schema.eventRsvps)
          .set({ status: "confirmed" })
          .where(eq(schema.eventRsvps.id, existing.id))
          .returning();
        return res.json({ success: true, data: updated });
      }

      const [rsvp] = await db.insert(schema.eventRsvps)
        .values({
          eventId: req.params.id,
          memberId: member.id,
          status: "confirmed"
        })
        .returning();

      res.json({ success: true, data: rsvp });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to RSVP" });
    }
  });

  app.delete("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.eventRsvps)
        .set({ status: "cancelled" })
        .where(and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.memberId, member.id)
        ));

      res.json({ success: true, data: { message: "RSVP cancelled" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel RSVP" });
    }
  });

  // Backward-compatible mobile endpoint; rsvpId is ignored because RSVP is unique per member+event.
  app.delete("/api/events/:id/rsvp/:rsvpId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db
        .update(schema.eventRsvps)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(schema.eventRsvps.eventId, req.params.id),
            eq(schema.eventRsvps.memberId, member.id)
          )
        );

      return res.json({ success: true, data: { message: "RSVP cancelled" } });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to cancel RSVP" });
    }
  });

  app.get("/api/events/:id/attendees", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const attendees = await db.query.eventRsvps.findMany({
        where: and(
          eq(schema.eventRsvps.eventId, req.params.id),
          eq(schema.eventRsvps.status, "confirmed")
        ),
        with: {
          member: {
            with: { user: true }
          }
        }
      });

      res.json({ success: true, data: attendees });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch attendees" });
    }
  });

  // Event Attendance Check-in (for awarding points)
  app.post("/api/events/:id/attend", requireAuth, eventCheckInLimiter, eventAntiCheat, async (req: AuthRequest, res: Response) => {
    try {
      const { coordinates } = req.body;
      const antiCheatData = (req as any).antiCheat;
      
      if (!antiCheatData) {
        return res.status(403).json({ success: false, error: "Security validation failed" });
      }

      const { memberId, ipAddress, userAgent, fingerprint } = antiCheatData;

      // Fetch event details
      const event = await db.query.events.findFirst({
        where: eq(schema.events.id, req.params.id)
      });

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      // Verify unique attendance
      const uniqueCheck = await antiCheatService.verifyUniqueEventAttendance(memberId, req.params.id);
      if (!uniqueCheck.valid) {
        return res.status(400).json({ success: false, error: uniqueCheck.error });
      }

      // Validate event timing
      const timingCheck = await antiCheatService.validateEventTiming(req.params.id);
      if (!timingCheck.valid) {
        return res.status(400).json({ success: false, error: timingCheck.error });
      }

      // Validate location if coordinates provided
      const eventCoordinates = event.coordinates as { lat: number; lng: number } | null;
      if (eventCoordinates && coordinates) {
        const locationCheck = antiCheatService.validateEventLocation(
          eventCoordinates,
          coordinates
        );
        if (!locationCheck.valid) {
          await antiCheatService.logFraudDetection(
            memberId,
            "event",
            locationCheck.error || "Location verification failed",
            "high",
            true,
            { eventId: req.params.id, userCoordinates: coordinates, eventCoordinates },
            ipAddress,
            userAgent
          );
          return res.status(403).json({ success: false, error: locationCheck.error });
        }
      }

      // Award points for attendance (configurable per event)
      const pointsEarned = event.points || 10; // Default 10 points

      // Record attendance with fraud detection metadata
      const [attendance] = await db.insert(schema.eventAttendance).values({
        eventId: req.params.id,
        memberId,
        coordinates: coordinates || null,
        pointsEarned,
        ipAddress,
        userAgent,
        fingerprint
      }).returning();

      // Award points
      const pointLedger = new PointLedgerService();
      await pointLedger.addPoints({
        memberId,
        points: pointsEarned,
        transactionType: "earn",
        source: "event",
        referenceType: "event",
        referenceId: req.params.id,
        metadata: { attendanceId: attendance.id, coordinates, ipAddress, userAgent }
      });

      // Log audit trail
      await logAudit({
        memberId,
        action: AuditActions.ADMIN_ACTION,
        resourceType: "event",
        resourceId: req.params.id,
        details: { attendanceId: attendance.id, pointsEarned, coordinates },
        ipAddress,
        userAgent,
        fingerprint,
        status: "success",
      });

      res.json({ 
        success: true, 
        data: { 
          attendance, 
          pointsEarned,
          message: `Successfully checked in! Earned ${pointsEarned} points.`
        } 
      });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "Already checked in to this event" 
        });
      }
      console.error("Event check-in error:", error);
      res.status(500).json({ success: false, error: "Failed to check in to event" });
    }
  });

  app.get("/api/elections", async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;
      let elections;

      if (status) {
        elections = await db.query.elections.findMany({
          where: eq(schema.elections.status, status as any),
          orderBy: desc(schema.elections.startDate)
        });
      } else {
        elections = await db.query.elections.findMany({
          orderBy: desc(schema.elections.startDate)
        });
      }

      const electionIds = elections.map((election) => election.id);
      let voteMap = new Map<string, typeof schema.votes.$inferSelect>();

      if (req.user && electionIds.length > 0) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
        });

        if (member) {
          const votes = await db.query.votes.findMany({
            where: and(
              eq(schema.votes.voterId, member.id),
              inArray(schema.votes.electionId, electionIds)
            ),
          });
          voteMap = new Map(votes.map((vote) => [vote.electionId, vote]));
        }
      }

      const data = elections.map((election) => {
        const vote = voteMap.get(election.id);
        return {
          ...election,
          hasVoted: !!vote,
          votedCandidateId: vote?.candidateId || null,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch elections" });
    }
  });

  app.get("/api/elections/:id", async (req: AuthRequest, res: Response) => {
    try {
      const election = await db.query.elections.findFirst({
        where: eq(schema.elections.id, req.params.id),
        with: { candidates: true }
      });

      if (!election) {
        return res.status(404).json({ success: false, error: "Election not found" });
      }

      let vote: typeof schema.votes.$inferSelect | null = null;
      if (req.user) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
        });

        if (member) {
          vote = await db.query.votes.findFirst({
            where: and(
              eq(schema.votes.electionId, req.params.id),
              eq(schema.votes.voterId, member.id)
            ),
          }) ?? null;
        }
      }

      const data = {
        ...election,
        hasVoted: !!vote,
        votedCandidateId: vote?.candidateId || null,
        candidates: election.candidates.map((candidate) => ({
          ...candidate,
          voteCount: candidate.votes || 0,
        })),
      };

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch election" });
    }
  });

  app.post("/api/elections", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const electionData = schema.insertElectionSchema.parse(req.body);
      const [election] = await db.insert(schema.elections).values(electionData).returning();

      // EMAIL INTEGRATION POINT: Send election notification to all eligible members
      // Uncomment the following code when ready to send election notifications:
      /*
      // Fetch all active members eligible to vote
      const members = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { user: true }
      });

      // Send election notification emails to all eligible members (consider using a job queue for large lists)
      for (const member of members) {
        const user = Array.isArray(member.user) ? member.user[0] : member.user;
        if (user?.email) {
          await emailService.sendElectionNotificationEmail(user.email, {
            firstName: user.firstName,
            electionTitle: election.title,
            electionDate: new Date(election.startDate).toLocaleDateString('en-NG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            votingStartTime: new Date(election.startDate).toLocaleTimeString('en-NG', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            votingEndTime: new Date(election.endDate).toLocaleTimeString('en-NG', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            electionDescription: election.description || ''
          });
        }
      }
      */

      // SMS INTEGRATION POINT: Send election notice SMS to members with phone numbers
      // Uncomment the following code when ready to send election SMS notifications:
      /*
      // Fetch all active members eligible to vote with phone numbers
      const members = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { user: true }
      });

      // Send election notice SMS to members (consider using a job queue for large lists)
      // IMPORTANT: Implement rate limiting to prevent SMS spam
      for (const member of members) {
        const user = Array.isArray(member.user) ? member.user[0] : member.user;
        if (user?.phone) {
          const startDate = new Date(election.startDate).toLocaleDateString('en-NG', { 
            month: 'short', 
            day: 'numeric' 
          });
          await smsService.sendElectionNoticeSMS(user.phone, {
            name: user.firstName,
            election: election.title,
            date: startDate
          });
        }
      }
      */

      // ========================================================================
      // PUSH NOTIFICATION INTEGRATION POINT: Election Announcement
      // ========================================================================
      // Send push notification to all eligible voters about the new election
      // Uncomment the following code when ready to send push notifications:
      /*
      import { pushService, NotificationTemplates } from "./push-service";
      
      // Get formatted deadline for notification
      const deadline = new Date(election.endDate).toLocaleDateString('en-NG', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Broadcast election announcement to all verified members
      // Only verified members should be allowed to vote
      await pushService.sendToSegment(
        "verified-members",
        NotificationTemplates.electionAnnouncement(
          election.title,
          deadline,
          election.id
        )
      );
      
      // Alternative: Broadcast to all members
      // await pushService.broadcast(
      //   NotificationTemplates.electionAnnouncement(election.title, deadline, election.id)
      // );
      
      console.log(`Push notification sent for election: ${election.title}`);
      */

      res.json({ success: true, data: election });
    } catch (error) {
      console.error("Create election error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create election";
      res.status(400).json({ success: false, error: errorMessage });
    }
  });

  app.patch("/api/elections/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [election] = await db.update(schema.elections)
        .set(req.body)
        .where(eq(schema.elections.id, req.params.id))
        .returning();

      res.json({ success: true, data: election });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update election" });
    }
  });

  app.post("/api/elections/:id/candidates", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const candidateData = schema.insertCandidateSchema.parse({
        ...req.body,
        electionId: req.params.id
      });

      const [candidate] = await db.insert(schema.candidates).values(candidateData).returning();
      res.json({ success: true, data: candidate });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to add candidate" });
    }
  });

  app.post("/api/elections/:id/vote", votingLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { candidateId } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existingVote = await db.query.votes.findFirst({
        where: and(
          eq(schema.votes.electionId, req.params.id),
          eq(schema.votes.voterId, member.id)
        )
      });

      if (existingVote) {
        return res.status(400).json({ success: false, error: "You have already voted in this election" });
      }

      const [vote] = await db.insert(schema.votes).values({
        electionId: req.params.id,
        candidateId,
        voterId: member.id,
        blockchainHash: `hash-${Date.now()}`
      }).returning();

      await db.update(schema.candidates)
        .set({ votes: sql`${schema.candidates.votes} + 1` })
        .where(eq(schema.candidates.id, candidateId));

      await db.update(schema.elections)
        .set({ totalVotes: sql`${schema.elections.totalVotes} + 1` })
        .where(eq(schema.elections.id, req.params.id));

      await logAudit({
        userId: req.user!.id,
        memberId: member.id,
        action: AuditActions.VOTE,
        resourceType: "election",
        resourceId: req.params.id,
        details: { candidateId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: "success",
      });

      res.json({ success: true, data: vote });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cast vote" });
    }
  });

  app.get("/api/elections/:id/results", async (req: Request, res: Response) => {
    try {
      const election = await db.query.elections.findFirst({
        where: eq(schema.elections.id, req.params.id),
        with: { candidates: true }
      });

      if (!election) {
        return res.status(404).json({ success: false, error: "Election not found" });
      }

      const sortedCandidates = [...election.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));

      res.json({
        success: true,
        data: {
          election,
          candidates: sortedCandidates,
          totalVotes: election.totalVotes
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch results" });
    }
  });

  app.get("/api/quizzes", async (req: Request, res: Response) => {
    try {
      const quizzes = await db.query.quizzes.findMany({
        orderBy: desc(schema.quizzes.createdAt)
      });
      res.json({ success: true, data: quizzes });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch quizzes" });
    }
  });

  app.get("/api/quizzes/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      // Get member to generate token
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // SECURITY: Never expose correct answer to client
      const { correctAnswer, ...safeQuizData } = quiz;

      // Generate secure token for this quiz attempt
      const quizToken = generateQuizToken(quiz.id, member.id);

      res.json({ 
        success: true, 
        data: {
          ...safeQuizData,
          quizToken  // Client must submit this with their answer
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch quiz" });
    }
  });

  app.post("/api/quizzes", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const quizData = schema.insertQuizSchema.parse(req.body);
      const [quiz] = await db.insert(schema.quizzes).values(quizData as any).returning();
      res.json({ success: true, data: quiz });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create quiz" });
    }
  });

  app.post("/api/quizzes/:id/attempt", requireAuth, quizLimiter, quizAntiCheat, async (req: AuthRequest, res: Response) => {
    try {
      const { selectedAnswer, quizToken, completionTime } = req.body;
      const antiCheatData = (req as any).antiCheat;
      
      if (!antiCheatData) {
        return res.status(403).json({ success: false, error: "Security validation failed" });
      }

      const { memberId, ipAddress, userAgent, fingerprint } = antiCheatData;

      // Verify quiz token
      const tokenVerification = verifyQuizToken(quizToken);
      if (!tokenVerification.valid) {
        await antiCheatService.logFraudDetection(
          memberId,
          "quiz",
          `Invalid token: ${tokenVerification.error}`,
          "high",
          true,
          { quizId: req.params.id },
          ipAddress,
          userAgent
        );
        return res.status(403).json({ 
          success: false, 
          error: "Invalid or expired quiz token" 
        });
      }

      // Verify token is for the correct quiz and member
      if (tokenVerification.quizId !== req.params.id || tokenVerification.memberId !== memberId) {
        await antiCheatService.logFraudDetection(
          memberId,
          "quiz",
          "Token mismatch - possible tampering",
          "critical",
          true,
          { expectedQuizId: req.params.id, tokenQuizId: tokenVerification.quizId },
          ipAddress,
          userAgent
        );
        return res.status(403).json({ 
          success: false, 
          error: "Token validation failed" 
        });
      }

      // Check for duplicate attempt
      const uniqueCheck = await antiCheatService.verifyUniqueQuizAttempt(memberId, req.params.id);
      if (!uniqueCheck.valid) {
        return res.status(400).json({ success: false, error: uniqueCheck.error });
      }

      // Validate completion time
      const timingCheck = antiCheatService.validateQuizTiming(completionTime || 0);
      if (!timingCheck.valid) {
        await antiCheatService.logFraudDetection(
          memberId,
          "quiz",
          timingCheck.error || "Suspicious completion time",
          "high",
          true,
          { completionTime },
          ipAddress,
          userAgent
        );
        return res.status(403).json({ 
          success: false, 
          error: timingCheck.error 
        });
      }

      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      // SERVER-SIDE ONLY: Determine correctness
      const isCorrect = selectedAnswer === quiz.correctAnswer;
      const pointsEarned = isCorrect ? quiz.points : 0;

      // Record attempt with fraud detection metadata
      const [attempt] = await db.insert(schema.quizAttempts).values({
        quizId: req.params.id,
        memberId,
        selectedAnswer,
        isCorrect,
        pointsEarned,
        ipAddress,
        userAgent,
        fingerprint,
        completionTime
      }).returning();

      // Award points if correct
      if (isCorrect) {
        const pointLedger = new PointLedgerService();
        await pointLedger.addPoints({
          memberId,
          points: pointsEarned,
          transactionType: "earn",
          source: "quiz",
          referenceType: "quiz",
          referenceId: req.params.id,
          metadata: { attemptId: attempt.id, isCorrect, completionTime, ipAddress, userAgent }
        });
      }

      // Log audit trail
      await logAudit({
        memberId,
        action: AuditActions.ADMIN_ACTION,
        resourceType: "quiz",
        resourceId: req.params.id,
        details: { isCorrect, pointsEarned, completionTime },
        ipAddress,
        userAgent,
        fingerprint,
        status: "success",
      });

      res.json({ success: true, data: { attempt, isCorrect, pointsEarned } });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "Quiz already attempted" 
        });
      }
      console.error("Quiz attempt error:", error);
      res.status(500).json({ success: false, error: "Failed to submit quiz attempt" });
    }
  });

  // ============================================================================
  // LEGACY TASK ROUTES - COMMENTED OUT (Replaced by comprehensive task system)
  // ============================================================================
  // NOTE: These old routes caused conflicts with the new comprehensive task routes.
  // The generic /api/tasks/:id was matching /api/tasks/micro before the specific route.
  // New comprehensive routes are at the end of this file (lines ~6200+)
  // 
  // app.get("/api/tasks", async (req: Request, res: Response) => {
  //   // OLD: Get volunteer tasks - replaced by /api/tasks/volunteer
  // });
  // 
  // app.get("/api/tasks/:id", async (req: Request, res: Response) => {
  //   // OLD: Get single task by ID - replaced by /api/tasks/volunteer/:id
  // });
  // ============================================================================

  app.post("/api/tasks", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const taskData = schema.insertVolunteerTaskSchema.parse(req.body);
      const [task] = await db.insert(schema.volunteerTasks).values(taskData as any).returning();
      
      // ========================================================================
      // PUSH NOTIFICATION INTEGRATION POINT: Task Creation (General)
      // ========================================================================
      // Broadcast new task to eligible members
      // Uncomment the following code when ready to send push notifications:
      /*
      import { pushService, NotificationTemplates } from "./push-service";
      
      // Broadcast task to all members or specific segment
      await pushService.broadcast(
        NotificationTemplates.taskAssignment(
          task.title,
          task.priority || "normal",
          task.id
        )
      );
      
      // Alternative: Send to specific segment based on task requirements
      // if (task.category === "Ward Mobilization") {
      //   await pushService.sendToSegment(
      //     "ward-leaders",
      //     NotificationTemplates.taskAssignment(task.title, task.priority || "normal", task.id)
      //   );
      // }
      
      console.log(`Push notification sent for task: ${task.title}`);
      */
      
      res.json({ success: true, data: task });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create task" });
    }
  });

  app.post("/api/tasks/:id/apply", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.taskApplications.findFirst({
        where: and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id)
        )
      });

      if (existing) {
        return res.status(400).json({ success: false, error: "You have already applied for this task" });
      }

      const [application] = await db.insert(schema.taskApplications).values({
        taskId: req.params.id,
        memberId: member.id,
        status: "pending"
      }).returning();

      res.json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to apply for task" });
    }
  });

  app.post("/api/tasks/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [application] = await db.update(schema.taskApplications)
        .set({ status: "completed" })
        .where(and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id)
        ))
        .returning();

      res.json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to complete task" });
    }
  });

  app.patch("/api/tasks/:id/approve", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.body;

      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      await db.update(schema.taskApplications)
        .set({ status: "accepted" })
        .where(and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, memberId)
        ));

      const pointLedger = new PointLedgerService();
      await pointLedger.addPoints({
        memberId,
        points: task.points,
        transactionType: "earn",
        source: "task",
        referenceType: "task",
        referenceId: req.params.id,
        metadata: { taskTitle: task.title, approved: true }
      });

      res.json({ success: true, data: { message: "Task approved and points awarded" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve task" });
    }
  });

  app.get("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const stateId = typeof req.query.stateId === "string" ? req.query.stateId : undefined;
      const lgaId = typeof req.query.lgaId === "string" ? req.query.lgaId : undefined;
      const wardId = typeof req.query.wardId === "string" ? req.query.wardId : undefined;

      const conditions: any[] = [];
      if (status) conditions.push(eq(schema.issueCampaigns.status, status as any));
      if (stateId) conditions.push(eq(schema.issueCampaigns.stateId, stateId));
      if (lgaId) conditions.push(eq(schema.issueCampaigns.lgaId, lgaId));
      if (wardId) conditions.push(eq(schema.issueCampaigns.wardId, wardId));

      const campaigns = await db.query.issueCampaigns.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(schema.issueCampaigns.createdAt),
        with: { author: { with: { user: true } } }
      });

      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await db.query.issueCampaigns.findFirst({
        where: eq(schema.issueCampaigns.id, req.params.id),
        with: {
          author: { with: { user: true } }
        }
      });

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      const comments = await db.query.campaignComments.findMany({
        where: eq(schema.campaignComments.campaignId, req.params.id),
        with: { member: { with: { user: true } } },
        orderBy: desc(schema.campaignComments.createdAt)
      });

      res.json({ success: true, data: { ...campaign, comments } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      let locationData: { stateId?: string; lgaId?: string; wardId?: string } = {};
      if (!req.body.stateId && !req.body.lgaId && !req.body.wardId && member.wardId) {
        const ward = await db.query.wards.findFirst({
          where: eq(schema.wards.id, member.wardId),
          with: { lga: true }
        });
        if (ward) {
          locationData = {
            wardId: ward.id,
            lgaId: ward.lgaId,
            stateId: ward.lga?.stateId
          };
        }
      }

      const campaignData = schema.insertCampaignSchema.parse({
        ...req.body,
        ...locationData,
        authorId: member.id
      });

      const [campaign] = await db.insert(schema.issueCampaigns).values(campaignData).returning();
      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set(req.body)
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update campaign" });
    }
  });

  app.post("/api/campaigns/:id/vote", requireAuth, votingLimiter, voteAntiCheat, async (req: AuthRequest, res: Response) => {
    try {
      const antiCheatData = (req as any).antiCheat;
      
      if (!antiCheatData) {
        return res.status(403).json({ success: false, error: "Security validation failed" });
      }

      const { memberId, ipAddress, userAgent, fingerprint } = antiCheatData;

      // Verify unique vote (check for duplicate)
      const uniqueCheck = await antiCheatService.verifyUniqueCampaignVote(memberId, req.params.id);
      if (!uniqueCheck.valid) {
        return res.status(400).json({ success: false, error: uniqueCheck.error });
      }

      // Record vote with fraud detection metadata
      const [vote] = await db.insert(schema.campaignVotes).values({
        campaignId: req.params.id,
        memberId,
        ipAddress,
        userAgent,
        fingerprint
      }).returning();

      // Increment campaign votes
      await db.update(schema.issueCampaigns)
        .set({ currentVotes: sql`${schema.issueCampaigns.currentVotes} + 1` })
        .where(eq(schema.issueCampaigns.id, req.params.id));

      // Log audit trail
      await logAudit({
        memberId,
        action: AuditActions.VOTE,
        resourceType: "campaign",
        resourceId: req.params.id,
        details: { voteId: vote.id },
        ipAddress,
        userAgent,
        fingerprint,
        status: "success",
      });

      res.json({ success: true, data: vote });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "You have already voted on this campaign" 
        });
      }
      console.error("Campaign vote error:", error);
      res.status(500).json({ success: false, error: "Failed to vote on campaign" });
    }
  });

  app.post("/api/campaigns/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [comment] = await db.insert(schema.campaignComments).values({
        campaignId: req.params.id,
        memberId: member.id,
        content
      }).returning();

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.patch("/api/campaigns/:id/approve", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set({ status: "approved" })
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve campaign" });
    }
  });

  app.get("/api/gamification/badges", async (req: Request, res: Response) => {
    try {
      const badges = await db.query.badges.findMany();
      res.json({ success: true, data: badges });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch badges" });
    }
  });

  app.get("/api/gamification/leaderboard", async (req: Request, res: Response) => {
    try {
      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users
        })
        .from(schema.userPoints)
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(100);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/gamification/my-stats", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const points = await db
        .select({ total: sql<number>`SUM(${schema.userPoints.amount})` })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id));

      const badges = await db.query.userBadges.findMany({
        where: eq(schema.userBadges.memberId, member.id),
        with: { badge: true }
      });

      res.json({
        success: true,
        data: {
          totalPoints: points[0]?.total || 0,
          badges: badges.map(b => b.badge)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  });

  app.get("/api/analytics/member-overview", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [pointsRow] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.userPoints.amount}), 0)`,
        })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id));

      const [badgesRow] = await db
        .select({
          total: sql<number>`COUNT(*)`,
        })
        .from(schema.userBadges)
        .where(eq(schema.userBadges.memberId, member.id));

      const [eventsRow] = await db
        .select({
          total: sql<number>`COUNT(*)`,
        })
        .from(schema.eventAttendance)
        .where(eq(schema.eventAttendance.memberId, member.id));

      const [tasksRow] = await db
        .select({
          total: sql<number>`COUNT(*)`,
        })
        .from(schema.taskCompletions)
        .where(
          and(
            eq(schema.taskCompletions.memberId, member.id),
            eq(schema.taskCompletions.status, "approved")
          )
        );

      const [membersRow] = await db
        .select({
          total: sql<number>`COUNT(*)`,
        })
        .from(schema.members);

      const leaderboard = await db
        .select({
          memberId: schema.members.id,
          totalPoints: sql<number>`COALESCE(SUM(${schema.userPoints.amount}), 0)`,
        })
        .from(schema.members)
        .leftJoin(schema.userPoints, eq(schema.userPoints.memberId, schema.members.id))
        .groupBy(schema.members.id)
        .orderBy(desc(sql`COALESCE(SUM(${schema.userPoints.amount}), 0)`));

      const rank = leaderboard.findIndex((entry) => entry.memberId === member.id) + 1;

      return res.json({
        success: true,
        data: {
          points: Number(pointsRow?.total) || 0,
          badges: Number(badgesRow?.total) || 0,
          eventsAttended: Number(eventsRow?.total) || 0,
          tasksCompleted: Number(tasksRow?.total) || 0,
          rank: rank > 0 ? rank : undefined,
          totalMembers: Number(membersRow?.total) || 0,
        },
      });
    } catch (error) {
      console.error("Member overview analytics error:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch member overview" });
    }
  });

  app.get("/api/micro-tasks", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
      const tasks = await db.query.microTasks.findMany({
        orderBy: desc(schema.microTasks.createdAt),
      });

      const completions = await db.query.taskCompletions.findMany({
        where: and(
          eq(schema.taskCompletions.memberId, member.id),
          eq(schema.taskCompletions.taskType, "micro")
        ),
      });

      const completionMap = new Map(completions.map((completion) => [completion.taskId, completion]));
      const tasksWithCompletion = tasks.map((task) => ({
        ...task,
        completed: completionMap.has(task.id),
        completion: completionMap.get(task.id),
      }));

      const data = limit && limit > 0 ? tasksWithCompletion.slice(0, limit) : tasksWithCompletion;
      return res.json({ success: true, data });
    } catch (error) {
      console.error("Fetch micro-tasks error:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch micro-tasks" });
    }
  });

  app.get("/api/incidents", async (req: Request, res: Response) => {
    try {
      const { severity } = req.query;
      let incidents;

      if (severity) {
        incidents = await db.query.incidents.findMany({
          where: eq(schema.incidents.severity, severity as any),
          orderBy: desc(schema.incidents.createdAt),
          with: { pollingUnit: true, reporter: { with: { user: true } } }
        });
      } else {
        incidents = await db.query.incidents.findMany({
          orderBy: desc(schema.incidents.createdAt),
          with: { pollingUnit: true, reporter: { with: { user: true } } }
        });
      }

      res.json({ success: true, data: incidents });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/incidents/:id", async (req: Request, res: Response) => {
    try {
      const incident = await db.query.incidents.findFirst({
        where: eq(schema.incidents.id, req.params.id),
        with: {
          pollingUnit: true,
          reporter: { with: { user: true } }
        }
      });

      if (!incident) {
        return res.status(404).json({ success: false, error: "Incident not found" });
      }

      const media = await db.query.incidentMedia.findMany({
        where: eq(schema.incidentMedia.incidentId, req.params.id)
      });

      res.json({ success: true, data: { ...incident, media } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch incident" });
    }
  });

  app.post("/api/incidents", requireAuth, upload.array("files", 5), async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Parse coordinates if provided
      let coordinates = null;
      if (req.body.coordinates) {
        try {
          coordinates = JSON.parse(req.body.coordinates);
        } catch (e) {
          console.error("Failed to parse coordinates:", e);
        }
      }

      const incidentData = schema.insertIncidentSchema.parse({
        title: req.body.title,
        description: req.body.description,
        severity: req.body.severity,
        location: req.body.location,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        pollingUnit: req.body.pollingUnit,
        reporterId: member.id,
      });

      const [incident] = await db.insert(schema.incidents).values(incidentData).returning();

      // Handle file uploads if any
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const mediaUrl = `/uploads/${Date.now()}-${file.originalname}`;
          const mediaType = file.mimetype.startsWith("video") ? "video" : "image";

          await db.insert(schema.incidentMedia).values({
            incidentId: incident.id,
            mediaUrl,
            mediaType,
          });
        }
      }

      io.emit("incident:new", incident);

      res.json({ success: true, data: incident });
    } catch (error: any) {
      console.error("Incident report error:", error);
      res.status(400).json({ success: false, error: error.message || "Failed to report incident" });
    }
  });

  app.patch("/api/incidents/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [incident] = await db.update(schema.incidents)
        .set(req.body)
        .where(eq(schema.incidents.id, req.params.id))
        .returning();

      io.emit("incident:updated", incident);

      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update incident" });
    }
  });

  app.post("/api/incidents/:id/media", requireAuth, upload.single("media"), async (req: AuthRequest, res: Response) => {
    try {
      const mediaUrl = `/uploads/${Date.now()}-${req.file?.originalname || "media"}`;
      const mediaType = req.file?.mimetype.startsWith("video") ? "video" : "image";

      const [media] = await db.insert(schema.incidentMedia).values({
        incidentId: req.params.id,
        mediaUrl,
        mediaType
      }).returning();

      res.json({ success: true, data: media });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to upload media" });
    }
  });

  app.get("/api/situation-room/polling-units", async (req: Request, res: Response) => {
    try {
      const units = await db.query.pollingUnits.findMany({
        with: { ward: { with: { lga: { with: { state: true } } } } },
        orderBy: desc(schema.pollingUnits.lastUpdate)
      });
      res.json({ success: true, data: units });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch polling units" });
    }
  });

  app.get("/api/situation-room/dashboard", async (req: Request, res: Response) => {
    try {
      const totalUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits);

      const activeUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "active"));

      const completedUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "completed"));

      const incidentUnits = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pollingUnits)
        .where(eq(schema.pollingUnits.status, "incident"));

      const totalVotes = await db.select({ total: sql<number>`SUM(${schema.pollingUnits.votes})` })
        .from(schema.pollingUnits);

      const recentIncidents = await db.query.incidents.findMany({
        orderBy: desc(schema.incidents.createdAt),
        limit: 10,
        with: { pollingUnit: true }
      });

      res.json({
        success: true,
        data: {
          totalUnits: Number(totalUnits[0]?.count) || 0,
          activeUnits: Number(activeUnits[0]?.count) || 0,
          completedUnits: Number(completedUnits[0]?.count) || 0,
          incidentUnits: Number(incidentUnits[0]?.count) || 0,
          totalVotes: Number(totalVotes[0]?.total) || 0,
          recentIncidents
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
  });

  app.patch("/api/situation-room/polling-units/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const [unit] = await db.update(schema.pollingUnits)
        .set({ ...req.body, lastUpdate: new Date() })
        .where(eq(schema.pollingUnits.id, req.params.id))
        .returning();

      io.emit("polling-unit:updated", unit);

      res.json({ success: true, data: unit });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update polling unit" });
    }
  });

  app.get("/api/news", async (req: Request, res: Response) => {
    try {
      const categoryQuery = typeof req.query.category === "string" ? req.query.category : undefined;
      const normalizedCategory = categoryQuery?.trim().toLowerCase();
      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
      const stateId = typeof req.query.stateId === "string" ? req.query.stateId : undefined;
      const lgaId = typeof req.query.lgaId === "string" ? req.query.lgaId : undefined;
      const wardId = typeof req.query.wardId === "string" ? req.query.wardId : undefined;

      const locationConditions: any[] = [];
      if (stateId) locationConditions.push(eq(schema.newsPosts.stateId, stateId));
      if (lgaId) locationConditions.push(eq(schema.newsPosts.lgaId, lgaId));
      if (wardId) locationConditions.push(eq(schema.newsPosts.wardId, wardId));

      const posts = await db.query.newsPosts.findMany({
        where: locationConditions.length > 0 ? and(...locationConditions) : undefined,
        orderBy: desc(schema.newsPosts.publishedAt),
        with: { author: true }
      });

      const filteredPosts = normalizedCategory && normalizedCategory !== "all"
        ? posts.filter((post) => {
            const normalizedPostCategory = post.category.trim().toLowerCase().replace(/\s+/g, "_");
            const categoryAliases: Record<string, string[]> = {
              party_news: ["party_news", "news", "party"],
              policy_updates: ["policy_updates", "policy", "policy_update"],
              events: ["events", "event"],
              opinion: ["opinion", "editorial"],
            };
            const acceptedCategories = categoryAliases[normalizedCategory] || [normalizedCategory];
            return acceptedCategories.includes(normalizedPostCategory);
          })
        : posts;

      const selectedPosts = limit && limit > 0 ? filteredPosts.slice(0, limit) : filteredPosts;

      const data = selectedPosts.map((post) => ({
        ...post,
        author: post.author
          ? (() => {
              const author = Array.isArray(post.author) ? post.author[0] : post.author;
              if (!author) return null;
              const { password: _authorPassword, ...safeAuthor } = author;
              return safeAuthor;
            })()
          : null,
        summary: post.excerpt,
        createdAt: post.publishedAt,
        likesCount: post.likes || 0,
        commentsCount: post.comments || 0,
        isFeatured: false,
        content: post.content || post.excerpt,
      }));

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req: Request, res: Response) => {
    try {
      const post = await db.query.newsPosts.findFirst({
        where: eq(schema.newsPosts.id, req.params.id),
        with: { author: true }
      });

      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      const engagement = await db.query.postEngagement.findMany({
        where: eq(schema.postEngagement.postId, req.params.id),
        with: { member: { with: { user: true } } }
      });

      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      const safeAuthor = author ? (() => {
        const { password: _authorPassword, ...authorWithoutPassword } = author;
        return authorWithoutPassword;
      })() : null;

      res.json({ success: true, data: { ...post, author: safeAuthor, engagement } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch post" });
    }
  });

  app.post("/api/news", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const postData = schema.insertNewsPostSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });

      const [post] = await db.insert(schema.newsPosts).values(postData).returning();
      
      // ========================================================================
      // PUSH NOTIFICATION INTEGRATION POINT: News Publishing
      // ========================================================================
      // Send push notification to all members about the new news article
      // Only send for important/featured news to avoid notification fatigue
      // Uncomment the following code when ready to send push notifications:
      /*
      import { pushService, NotificationTemplates } from "./push-service";
      
      // Only send push notifications for featured/important news
      if (post.featured || post.category === "Breaking News") {
        // Broadcast news alert to all members
        await pushService.broadcast(
          NotificationTemplates.newsAlert(
            post.title,
            post.category || "News",
            post.id
          )
        );
        
        console.log(`Push notification sent for news: ${post.title}`);
      }
      
      // Alternative: Send to specific segment based on news category
      // if (post.category === "Policy") {
      //   await pushService.sendToSegment(
      //     "ward-leaders",
      //     NotificationTemplates.newsAlert(post.title, post.category, post.id)
      //   );
      // }
      */
      
      res.json({ success: true, data: post });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create post" });
    }
  });

  app.post("/api/news/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.postEngagement.findFirst({
        where: and(
          eq(schema.postEngagement.postId, req.params.id),
          eq(schema.postEngagement.memberId, member.id),
          eq(schema.postEngagement.type, "like")
        )
      });

      if (existing) {
        await db.delete(schema.postEngagement).where(eq(schema.postEngagement.id, existing.id));
        await db.update(schema.newsPosts)
          .set({ likes: sql`${schema.newsPosts.likes} - 1` })
          .where(eq(schema.newsPosts.id, req.params.id));
        return res.json({ success: true, data: { liked: false } });
      }

      await db.insert(schema.postEngagement).values({
        postId: req.params.id,
        memberId: member.id,
        type: "like"
      });

      await db.update(schema.newsPosts)
        .set({ likes: sql`${schema.newsPosts.likes} + 1` })
        .where(eq(schema.newsPosts.id, req.params.id));

      res.json({ success: true, data: { liked: true } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to like post" });
    }
  });

  app.get("/api/news/:id/comments", async (req: Request, res: Response) => {
    try {
      const comments = await db.query.newsComments.findMany({
        where: eq(schema.newsComments.newsPostId, req.params.id),
        with: {
          member: {
            with: { user: true }
          },
          replies: {
            with: {
              member: {
                with: { user: true }
              }
            }
          }
        },
        orderBy: desc(schema.newsComments.createdAt)
      });

      const topLevelComments = comments.filter(c => !c.parentId);
      res.json({ success: true, data: topLevelComments });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch comments" });
    }
  });

  app.post("/api/news/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [comment] = await db.insert(schema.newsComments).values({
        newsPostId: req.params.id,
        memberId: member.id,
        content
      }).returning() as any[];

      await db.update(schema.newsPosts)
        .set({ comments: sql`${schema.newsPosts.comments} + 1` })
        .where(eq(schema.newsPosts.id, req.params.id));

      const commentWithMember = await db.query.newsComments.findFirst({
        where: eq(schema.newsComments.id, comment.id),
        with: {
          member: {
            with: { user: true }
          }
        }
      });

      res.json({ success: true, data: commentWithMember });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.post("/api/news/comments/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.newsCommentLikes.findFirst({
        where: and(
          eq(schema.newsCommentLikes.commentId, req.params.id),
          eq(schema.newsCommentLikes.memberId, member.id)
        )
      });

      if (existing) {
        await db.delete(schema.newsCommentLikes).where(eq(schema.newsCommentLikes.id, existing.id));
        await db.update(schema.newsComments)
          .set({ likes: sql`${schema.newsComments.likes} - 1` })
          .where(eq(schema.newsComments.id, req.params.id));
        return res.json({ success: true, data: { liked: false } });
      }

      await db.insert(schema.newsCommentLikes).values({
        commentId: req.params.id,
        memberId: member.id
      });

      await db.update(schema.newsComments)
        .set({ likes: sql`${schema.newsComments.likes} + 1` })
        .where(eq(schema.newsComments.id, req.params.id));

      res.json({ success: true, data: { liked: true } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to like comment" });
    }
  });

  app.post("/api/news/comments/:id/reply", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const parentComment = await db.query.newsComments.findFirst({
        where: eq(schema.newsComments.id, req.params.id)
      });

      if (!parentComment) {
        return res.status(404).json({ success: false, error: "Parent comment not found" });
      }

      const [reply] = await db.insert(schema.newsComments).values({
        newsPostId: parentComment.newsPostId,
        memberId: member.id,
        content,
        parentId: req.params.id
      }).returning() as any[];

      await db.update(schema.newsPosts)
        .set({ comments: sql`${schema.newsPosts.comments} + 1` })
        .where(eq(schema.newsPosts.id, parentComment.newsPostId));

      const replyWithMember = await db.query.newsComments.findFirst({
        where: eq(schema.newsComments.id, reply.id),
        with: {
          member: {
            with: { user: true }
          }
        }
      });

      res.json({ success: true, data: replyWithMember });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to add reply" });
    }
  });

  app.delete("/api/news/comments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const comment = await db.query.newsComments.findFirst({
        where: eq(schema.newsComments.id, req.params.id)
      });

      if (!comment) {
        return res.status(404).json({ success: false, error: "Comment not found" });
      }

      if (comment.memberId !== member.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      await db.delete(schema.newsComments).where(eq(schema.newsComments.id, req.params.id));

      await db.update(schema.newsPosts)
        .set({ comments: sql`${schema.newsPosts.comments} - 1` })
        .where(eq(schema.newsPosts.id, comment.newsPostId));

      res.json({ success: true, data: { message: "Comment deleted" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete comment" });
    }
  });

  app.get("/api/analytics/overview", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members);

      const activeMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members)
        .where(eq(schema.members.status, "active"));

      const totalEvents = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events);

      const totalElections = await db.select({ count: sql<number>`count(*)` })
        .from(schema.elections);

      const totalVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.votes);

      res.json({
        success: true,
        data: {
          totalMembers: Number(totalMembers[0]?.count) || 0,
          activeMembers: Number(activeMembers[0]?.count) || 0,
          totalEvents: Number(totalEvents[0]?.count) || 0,
          totalElections: Number(totalElections[0]?.count) || 0,
          totalVotes: Number(totalVotes[0]?.count) || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/membership-stats", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const statsByWard = await db
        .select({
          wardId: schema.members.wardId,
          count: sql<number>`count(*)`,
          ward: schema.wards
        })
        .from(schema.members)
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .groupBy(schema.members.wardId, schema.wards.id);

      res.json({ success: true, data: statsByWard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch membership stats" });
    }
  });

  app.get("/api/analytics/engagement-metrics", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalRsvps = await db.select({ count: sql<number>`count(*)` })
        .from(schema.eventRsvps);

      const totalQuizAttempts = await db.select({ count: sql<number>`count(*)` })
        .from(schema.quizAttempts);

      const totalTaskApplications = await db.select({ count: sql<number>`count(*)` })
        .from(schema.taskApplications);

      const totalCampaignVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.campaignVotes);

      res.json({
        success: true,
        data: {
          totalRsvps: Number(totalRsvps[0]?.count) || 0,
          totalQuizAttempts: Number(totalQuizAttempts[0]?.count) || 0,
          totalTaskApplications: Number(totalTaskApplications[0]?.count) || 0,
          totalCampaignVotes: Number(totalCampaignVotes[0]?.count) || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch engagement metrics" });
    }
  });

  app.get("/api/analytics/dues-summary", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues);

      const paidDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues)
        .where(eq(schema.membershipDues.paymentStatus, "completed"));

      const pendingDues = await db.select({ total: sql<number>`SUM(CAST(${schema.membershipDues.amount} AS NUMERIC))` })
        .from(schema.membershipDues)
        .where(eq(schema.membershipDues.paymentStatus, "pending"));

      res.json({
        success: true,
        data: {
          totalDues: totalDues[0]?.total || 0,
          paidDues: paidDues[0]?.total || 0,
          pendingDues: pendingDues[0]?.total || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch dues summary" });
    }
  });

  app.get("/api/analytics/dashboard", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalMembers = await db.select({ count: sql<number>`count(*)` }).from(schema.members);
      const activeMembers = await db.select({ count: sql<number>`count(*)` }).from(schema.members).where(eq(schema.members.status, "active"));
      const activeElections = await db.select({ count: sql<number>`count(*)` }).from(schema.elections).where(sql`${schema.elections.status} = 'ongoing'`);
      const upcomingEvents = await db.select({ count: sql<number>`count(*)` }).from(schema.events).where(gte(schema.events.date, new Date()));
      const duesCollected = await db.select({ total: sql<number>`COALESCE(SUM(CAST(${schema.membershipDues.amount} AS NUMERIC)), 0)` }).from(schema.membershipDues).where(eq(schema.membershipDues.paymentStatus, "completed"));
      const totalDonations = await db.select({ total: sql<number>`COALESCE(SUM(CAST(${schema.donations.amount} AS NUMERIC)), 0)` }).from(schema.donations).where(eq(schema.donations.paymentStatus, "completed"));

      const totalRsvps = await db.select({ count: sql<number>`count(*)` }).from(schema.eventRsvps);
      const totalQuizAttempts = await db.select({ count: sql<number>`count(*)` }).from(schema.quizAttempts);
      const totalVotes = await db.select({ count: sql<number>`count(*)` }).from(schema.votes);
      const totalTaskApps = await db.select({ count: sql<number>`count(*)` }).from(schema.taskApplications);
      const totalEngagement = Number(totalRsvps[0]?.count || 0) + Number(totalQuizAttempts[0]?.count || 0) + Number(totalVotes[0]?.count || 0) + Number(totalTaskApps[0]?.count || 0);
      const memberCount = Number(totalMembers[0]?.count || 1);
      const engagementRate = memberCount > 0 ? Math.min(Math.round((totalEngagement / memberCount) * 100), 100) : 0;

      const monthlyMembers = await db.select({
        month: sql<string>`TO_CHAR(${schema.members.joinDate}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${schema.members.joinDate})`,
        count: sql<number>`count(*)`
      }).from(schema.members)
        .where(sql`${schema.members.joinDate} >= NOW() - INTERVAL '6 months'`)
        .groupBy(sql`TO_CHAR(${schema.members.joinDate}, 'Mon')`, sql`EXTRACT(MONTH FROM ${schema.members.joinDate})`)
        .orderBy(sql`EXTRACT(MONTH FROM ${schema.members.joinDate})`);

      const monthlyDues = await db.select({
        month: sql<string>`TO_CHAR(${schema.membershipDues.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${schema.membershipDues.createdAt})`,
        total: sql<number>`COALESCE(SUM(CAST(${schema.membershipDues.amount} AS NUMERIC)), 0)`
      }).from(schema.membershipDues)
        .where(and(
          eq(schema.membershipDues.paymentStatus, "completed"),
          sql`${schema.membershipDues.createdAt} >= NOW() - INTERVAL '6 months'`
        ))
        .groupBy(sql`TO_CHAR(${schema.membershipDues.createdAt}, 'Mon')`, sql`EXTRACT(MONTH FROM ${schema.membershipDues.createdAt})`)
        .orderBy(sql`EXTRACT(MONTH FROM ${schema.membershipDues.createdAt})`);

      const recentLogs = await db.select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        createdAt: schema.auditLogs.createdAt,
        status: schema.auditLogs.status,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
        .from(schema.auditLogs)
        .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(10);

      const recentActivity = recentLogs.map((log) => ({
        id: log.id,
        action: log.action.replace(/_/g, ' '),
        user: log.firstName ? `${log.firstName} ${log.lastName}` : 'System',
        time: log.createdAt ? new Date(log.createdAt).toISOString() : null,
        status: log.status,
      }));

      res.json({
        success: true,
        data: {
          totalMembers: Number(totalMembers[0]?.count) || 0,
          activeMembers: Number(activeMembers[0]?.count) || 0,
          activeElections: Number(activeElections[0]?.count) || 0,
          upcomingEvents: Number(upcomingEvents[0]?.count) || 0,
          duesCollected: Number(duesCollected[0]?.total) || 0,
          totalDonations: Number(totalDonations[0]?.total) || 0,
          engagementRate,
          monthlyMembers: monthlyMembers.map(m => ({ month: m.month, members: Number(m.count) })),
          monthlyDues: monthlyDues.map(m => ({ month: m.month, revenue: Number(m.total) })),
          recentActivity,
        }
      });
    } catch (error) {
      console.error("Dashboard analytics error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch dashboard analytics" });
    }
  });

  app.get("/api/admin/system-config", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const configKeys = ["maintenance_mode", "member_registration", "election_voting", "campaign_creation", "email_notifications"];
      const settings = await db.select()
        .from(schema.appSettings)
        .where(sql`${schema.appSettings.key} = ANY(${configKeys})`);
      
      const config: Record<string, boolean> = {};
      for (const key of configKeys) {
        const setting = settings.find(s => s.key === key);
        config[key] = setting ? (setting.value as any) === true : key !== "maintenance_mode";
      }
      
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch system config" });
    }
  });

  app.put("/api/admin/system-config", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const allowedKeys = ["maintenance_mode", "member_registration", "election_voting", "campaign_creation", "email_notifications"];
      const updates = req.body;
      
      for (const [key, value] of Object.entries(updates)) {
        if (!allowedKeys.includes(key)) continue;
        await db.insert(schema.appSettings)
          .values({ key, value: value as any, updatedBy: req.user!.id, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: schema.appSettings.key,
            set: { value: value as any, updatedBy: req.user!.id, updatedAt: new Date() }
          });
      }

      if (req.user) {
        await logAudit({
          userId: req.user.id,
          action: AuditActions.ADMIN_UPDATE,
          resourceType: "system_config",
          resourceId: "system-config",
          details: updates,
          status: "success",
        });
      }
      
      res.json({ success: true, message: "System configuration updated" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update system config" });
    }
  });

  app.get("/api/admin/system-health", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      let dbStatus = "operational";
      try {
        await db.execute(sql`SELECT 1`);
      } catch {
        dbStatus = "error";
      }

      const memberCount = await db.select({ count: sql<number>`count(*)` }).from(schema.members);
      const eventCount = await db.select({ count: sql<number>`count(*)` }).from(schema.events);
      const electionCount = await db.select({ count: sql<number>`count(*)` }).from(schema.elections);

      res.json({
        success: true,
        data: {
          api: "operational",
          database: dbStatus,
          websocket: "operational",
          totalRecords: {
            members: Number(memberCount[0]?.count) || 0,
            events: Number(eventCount[0]?.count) || 0,
            elections: Number(electionCount[0]?.count) || 0,
          },
          uptime: process.uptime(),
          memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to check system health" });
    }
  });

  app.delete("/api/badges/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [deleted] = await db.delete(schema.badges).where(eq(schema.badges.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ success: false, error: "Badge not found" });
      res.json({ success: true, data: deleted });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete badge" });
    }
  });

  app.post("/api/badges/:id/award", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.body;
      if (!memberId) return res.status(400).json({ success: false, error: "Member ID required" });
      
      const badge = await db.query.badges.findFirst({ where: eq(schema.badges.id, req.params.id) });
      if (!badge) return res.status(404).json({ success: false, error: "Badge not found" });
      
      const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
      if (!member) return res.status(404).json({ success: false, error: "Member not found" });

      const existing = await db.query.userBadges.findFirst({
        where: and(
          eq(schema.userBadges.memberId, memberId),
          eq(schema.userBadges.badgeId, req.params.id)
        )
      });
      if (existing) return res.status(400).json({ success: false, error: "Member already has this badge" });

      const [awarded] = await db.insert(schema.userBadges).values({
        memberId,
        badgeId: req.params.id,
      }).returning();

      res.json({ success: true, data: awarded });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to award badge" });
    }
  });

  app.post("/api/notifications/broadcast", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { title, message, recipients } = req.body;
      if (!title || !message) return res.status(400).json({ success: false, error: "Title and message required" });

      let members;
      if (recipients === "active") {
        members = await db.query.members.findMany({ where: eq(schema.members.status, "active") });
      } else {
        members = await db.query.members.findMany();
      }

      const notifications = members.map(m => ({
        memberId: m.id,
        title,
        message,
        type: "broadcast" as const,
      }));

      if (notifications.length > 0) {
        await db.insert(schema.notifications).values(notifications);
      }

      if (req.user) {
        await logAudit({
          userId: req.user.id,
          action: AuditActions.ADMIN_ACTION,
          resourceType: "notification",
          resourceId: "broadcast",
          details: { title, recipientCount: notifications.length, recipients },
          status: "success",
        });
      }

      res.json({ success: true, message: `Notification sent to ${notifications.length} members` });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to broadcast notification" });
    }
  });

  app.get("/api/admin/recent-notifications", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const recentNotifications = await db.select({
        title: schema.notifications.title,
        message: schema.notifications.message,
        type: schema.notifications.type,
        createdAt: schema.notifications.createdAt,
        count: sql<number>`count(*)`
      })
        .from(schema.notifications)
        .groupBy(schema.notifications.title, schema.notifications.message, schema.notifications.type, schema.notifications.createdAt)
        .orderBy(desc(schema.notifications.createdAt))
        .limit(10);

      res.json({ success: true, data: recentNotifications });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch recent notifications" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const notifications = await db.query.notifications.findMany({
        where: eq(schema.notifications.memberId, member.id),
        orderBy: desc(schema.notifications.createdAt)
      });

      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const [notification] = await db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, req.params.id))
        .returning();

      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.memberId, member.id));

      res.json({ success: true, data: { message: "All notifications marked as read" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/analytics/public-overview", async (req: Request, res: Response) => {
    try {
      const totalMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members);

      const activeMembers = await db.select({ count: sql<number>`count(*)` })
        .from(schema.members)
        .where(eq(schema.members.status, "active"));

      const totalEvents = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events);

      const upcomingEvents = await db.select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(gte(schema.events.date, new Date()));

      const totalElections = await db.select({ count: sql<number>`count(*)` })
        .from(schema.elections);

      const totalVotes = await db.select({ count: sql<number>`count(*)` })
        .from(schema.votes);

      const activeCampaigns = await db.select({ count: sql<number>`count(*)` })
        .from(schema.issueCampaigns)
        .where(eq(schema.issueCampaigns.status, "active"));

      const totalIdeas = await db.select({ count: sql<number>`count(*)` })
        .from(schema.ideas);

      const statesWithPresence = await db
        .select({ count: sql<number>`count(distinct ${schema.lgas.stateId})` })
        .from(schema.members)
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .where(sql`${schema.lgas.stateId} IS NOT NULL`);

      const wardsCovered = await db
        .select({ count: sql<number>`count(distinct ${schema.members.wardId})` })
        .from(schema.members);

      const totalEngagementPoints = await db
        .select({ total: sql<number>`COALESCE(SUM(${schema.userPoints.amount}), 0)` })
        .from(schema.userPoints);

      res.json({
        success: true,
        data: {
          totalMembers: Number(totalMembers[0]?.count) || 0,
          activeMembers: Number(activeMembers[0]?.count) || 0,
          totalEvents: Number(totalEvents[0]?.count) || 0,
          upcomingEvents: Number(upcomingEvents[0]?.count) || 0,
          totalElections: Number(totalElections[0]?.count) || 0,
          totalVotes: Number(totalVotes[0]?.count) || 0,
          activeCampaigns: Number(activeCampaigns[0]?.count) || 0,
          totalIdeas: Number(totalIdeas[0]?.count) || 0,
          statesWithPresence: Number(statesWithPresence[0]?.count) || 0,
          wardsCovered: Number(wardsCovered[0]?.count) || 0,
          totalEngagementPoints: Number(totalEngagementPoints[0]?.total) || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/map-data", async (req: Request, res: Response) => {
    try {
      const states = await db.query.states.findMany({
        orderBy: asc(schema.states.name)
      });

      const statesData = await Promise.all(states.map(async (state) => {
        const membersByState = await db
          .select({ count: sql<number>`count(distinct ${schema.members.id})` })
          .from(schema.members)
          .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
          .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
          .where(eq(schema.lgas.stateId, state.id));

        const activeMembersByState = await db
          .select({ count: sql<number>`count(distinct ${schema.members.id})` })
          .from(schema.members)
          .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
          .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
          .where(and(
            eq(schema.lgas.stateId, state.id),
            eq(schema.members.status, "active")
          ));

        const upcomingEventsByState = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.events)
          .where(and(
            eq(schema.events.stateId, state.id),
            gte(schema.events.date, new Date())
          ));

        const activeCampaignsByState = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.issueCampaigns)
          .leftJoin(schema.members, eq(schema.issueCampaigns.authorId, schema.members.id))
          .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
          .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
          .where(and(
            eq(schema.lgas.stateId, state.id),
            eq(schema.issueCampaigns.status, "active")
          ));

        const lgasCovered = await db
          .select({ count: sql<number>`count(distinct ${schema.lgas.id})` })
          .from(schema.lgas)
          .leftJoin(schema.wards, eq(schema.lgas.id, schema.wards.lgaId))
          .leftJoin(schema.members, eq(schema.wards.id, schema.members.wardId))
          .where(and(
            eq(schema.lgas.stateId, state.id),
            sql`${schema.members.id} IS NOT NULL`
          ));

        const wardsCovered = await db
          .select({ count: sql<number>`count(distinct ${schema.wards.id})` })
          .from(schema.wards)
          .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
          .leftJoin(schema.members, eq(schema.wards.id, schema.members.wardId))
          .where(and(
            eq(schema.lgas.stateId, state.id),
            sql`${schema.members.id} IS NOT NULL`
          ));

        const pollingUnitsCount = await db
          .select({ count: sql<number>`count(distinct ${schema.pollingUnits.id})` })
          .from(schema.pollingUnits)
          .leftJoin(schema.wards, eq(schema.pollingUnits.wardId, schema.wards.id))
          .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
          .where(eq(schema.lgas.stateId, state.id));

        const newsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.newsPosts)
          .where(eq(schema.newsPosts.stateId, state.id));

        const tasksCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.volunteerTasks)
          .where(eq(schema.volunteerTasks.stateId, state.id));

        return {
          stateId: state.id,
          name: state.name,
          code: state.code,
          memberCount: Number(membersByState[0]?.count) || 0,
          activeMembers: Number(activeMembersByState[0]?.count) || 0,
          upcomingEvents: Number(upcomingEventsByState[0]?.count) || 0,
          activeCampaigns: Number(activeCampaignsByState[0]?.count) || 0,
          lgasCovered: Number(lgasCovered[0]?.count) || 0,
          wardsCovered: Number(wardsCovered[0]?.count) || 0,
          pollingUnitsCount: Number(pollingUnitsCount[0]?.count) || 0,
          newsCount: Number(newsCount[0]?.count) || 0,
          tasksCount: Number(tasksCount[0]?.count) || 0
        };
      }));

      res.json({ success: true, data: { states: statesData } });
    } catch (error) {
      console.error("Map data error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch map data" });
    }
  });

  app.get("/api/analytics/recent-activity", async (req: Request, res: Response) => {
    try {
      const recentMembers = await db.query.members.findMany({
        orderBy: desc(schema.members.joinDate),
        limit: 10,
        with: {
          user: true,
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          }
        }
      });

      const upcomingEvents = await db.query.events.findMany({
        where: gte(schema.events.date, new Date()),
        orderBy: asc(schema.events.date),
        limit: 5
      });

      const popularCampaigns = await db.query.issueCampaigns.findMany({
        where: eq(schema.issueCampaigns.status, "active"),
        orderBy: desc(schema.issueCampaigns.currentVotes),
        limit: 3,
        with: {
          author: {
            with: { user: true }
          }
        }
      });

      const trendingIdeas = await db.query.ideas.findMany({
        orderBy: desc(schema.ideas.votesCount),
        limit: 3,
        with: {
          member: {
            with: { user: true }
          }
        }
      });

      res.json({
        success: true,
        data: {
          recentMembers,
          upcomingEvents,
          popularCampaigns,
          trendingIdeas
        }
      });
    } catch (error) {
      console.error("Recent activity error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch recent activity" });
    }
  });

  app.get("/api/analytics/state-stats/:stateId", async (req: Request, res: Response) => {
    try {
      const { stateId } = req.params;

      const state = await db.query.states.findFirst({
        where: eq(schema.states.id, stateId)
      });

      if (!state) {
        return res.status(404).json({ success: false, error: "State not found" });
      }

      const memberCount = await db
        .select({ count: sql<number>`count(distinct ${schema.members.id})` })
        .from(schema.members)
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .where(eq(schema.lgas.stateId, stateId));

      const activeMembers = await db
        .select({ count: sql<number>`count(distinct ${schema.members.id})` })
        .from(schema.members)
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .where(and(
          eq(schema.lgas.stateId, stateId),
          eq(schema.members.status, "active")
        ));

      const upcomingEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(and(
          eq(schema.events.stateId, stateId),
          gte(schema.events.date, new Date())
        ));

      const activeCampaigns = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.issueCampaigns)
        .leftJoin(schema.members, eq(schema.issueCampaigns.authorId, schema.members.id))
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .where(and(
          eq(schema.lgas.stateId, stateId),
          eq(schema.issueCampaigns.status, "active")
        ));

      const lgasCovered = await db
        .select({ count: sql<number>`count(distinct ${schema.lgas.id})` })
        .from(schema.lgas)
        .leftJoin(schema.wards, eq(schema.lgas.id, schema.wards.lgaId))
        .leftJoin(schema.members, eq(schema.wards.id, schema.members.wardId))
        .where(and(
          eq(schema.lgas.stateId, stateId),
          sql`${schema.members.id} IS NOT NULL`
        ));

      const wardsCovered = await db
        .select({ count: sql<number>`count(distinct ${schema.wards.id})` })
        .from(schema.wards)
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .leftJoin(schema.members, eq(schema.wards.id, schema.members.wardId))
        .where(and(
          eq(schema.lgas.stateId, stateId),
          sql`${schema.members.id} IS NOT NULL`
        ));

      res.json({
        success: true,
        data: {
          state,
          memberCount: Number(memberCount[0]?.count) || 0,
          activeMembers: Number(activeMembers[0]?.count) || 0,
          upcomingEvents: Number(upcomingEvents[0]?.count) || 0,
          activeCampaigns: Number(activeCampaigns[0]?.count) || 0,
          lgasCovered: Number(lgasCovered[0]?.count) || 0,
          wardsCovered: Number(wardsCovered[0]?.count) || 0
        }
      });
    } catch (error) {
      console.error("State stats error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch state statistics" });
    }
  });

  app.patch("/api/users/:userId/role", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      
      if (!["member", "coordinator", "admin"].includes(role)) {
        return res.status(400).json({ success: false, error: "Invalid role" });
      }

      const [user] = await db.update(schema.users)
        .set({ role })
        .where(eq(schema.users.id, req.params.userId))
        .returning();

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update user role" });
    }
  });

  app.patch("/api/campaigns/:id/reject", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [campaign] = await db.update(schema.issueCampaigns)
        .set({ status: "rejected" })
        .where(eq(schema.issueCampaigns.id, req.params.id))
        .returning();

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to reject campaign" });
    }
  });

  app.post("/api/badges", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const badgeData = schema.insertBadgeSchema.parse(req.body);
      const [badge] = await db.insert(schema.badges).values(badgeData).returning();
      res.json({ success: true, data: badge });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create badge" });
    }
  });

  app.get("/api/badges/my-badges", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const earnedBadges = await db.query.userBadges.findMany({
        where: eq(schema.userBadges.memberId, member.id),
        with: { badge: true }
      });

      res.json({ success: true, data: earnedBadges });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch earned badges" });
    }
  });

  app.post("/api/badges/check", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const allBadges = await db.query.badges.findMany();
      const earnedBadgeIds = (await db.query.userBadges.findMany({
        where: eq(schema.userBadges.memberId, member.id)
      })).map(ub => ub.badgeId);

      const newlyEarnedBadges = [];

      for (const badge of allBadges) {
        if (earnedBadgeIds.includes(badge.id)) continue;

        const criteria = badge.criteria as { type: string; value: number };
        let earned = false;

        switch (criteria.type) {
          case "tasks_completed": {
            const taskCount = await db.$count(schema.taskCompletions, 
              and(
                eq(schema.taskCompletions.memberId, member.id),
                eq(schema.taskCompletions.status, "approved")
              )
            );
            earned = taskCount >= criteria.value;
            break;
          }
          case "quizzes_completed": {
            const quizCount = await db.$count(schema.quizAttempts, 
              eq(schema.quizAttempts.memberId, member.id)
            );
            earned = quizCount >= criteria.value;
            break;
          }
          case "events_attended": {
            const eventCount = await db.$count(schema.eventRsvps, 
              and(
                eq(schema.eventRsvps.memberId, member.id),
                eq(schema.eventRsvps.status, "confirmed")
              )
            );
            earned = eventCount >= criteria.value;
            break;
          }
          case "campaigns_supported": {
            const campaignCount = await db.$count(schema.campaignVotes, 
              eq(schema.campaignVotes.memberId, member.id)
            );
            earned = campaignCount >= criteria.value;
            break;
          }
          case "ideas_submitted": {
            const ideaCount = await db.$count(schema.ideas, 
              eq(schema.ideas.memberId, member.id)
            );
            earned = ideaCount >= criteria.value;
            break;
          }
          case "total_points": {
            const points = await db
              .select({ total: sql<number>`SUM(${schema.userPoints.amount})` })
              .from(schema.userPoints)
              .where(eq(schema.userPoints.memberId, member.id));
            earned = (points[0]?.total || 0) >= criteria.value;
            break;
          }
        }

        if (earned) {
          const [userBadge] = await db.insert(schema.userBadges).values({
            memberId: member.id,
            badgeId: badge.id,
            progress: criteria.value
          }).returning();

          if (badge.points && badge.points > 0) {
            const pointLedger = new PointLedgerService();
            await pointLedger.addPoints({
              memberId: member.id,
              points: badge.points,
              transactionType: "earn",
              source: "badge",
              referenceType: "badge",
              referenceId: badge.id,
              metadata: { badgeName: badge.name, badgeCategory: badge.category, criteriaValue: criteria.value }
            });
          }

          newlyEarnedBadges.push({ ...userBadge, badge });
        }
      }

      res.json({ success: true, data: newlyEarnedBadges });
    } catch (error) {
      console.error("Badge check error:", error);
      res.status(500).json({ success: false, error: "Failed to check badges" });
    }
  });

  app.delete("/api/badges/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.badges).where(eq(schema.badges.id, req.params.id));
      res.json({ success: true, data: { message: "Badge deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete badge" });
    }
  });

  // Points Endpoints
  app.get("/api/points/my-points", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const pointsBreakdown = await db
        .select({
          source: schema.userPoints.source,
          total: sql<number>`SUM(${schema.userPoints.amount})`,
          count: sql<number>`COUNT(*)`
        })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.memberId, member.id))
        .groupBy(schema.userPoints.source);

      const totalPoints = pointsBreakdown.reduce((sum, item) => sum + Number(item.total), 0);

      res.json({ 
        success: true, 
        data: { 
          totalPoints, 
          breakdown: pointsBreakdown 
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch points" });
    }
  });

  app.post("/api/points/award", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId, source, amount } = req.body;

      const pointLedger = new PointLedgerService();
      const points = amount > 0 
        ? await pointLedger.addPoints({
            memberId,
            points: amount,
            transactionType: "earn",
            source: source || "admin_award",
            referenceType: "admin_award",
            referenceId: req.user!.id,
            metadata: { awardedBy: req.user!.id, adminEmail: req.user!.email }
          })
        : await pointLedger.deductPoints({
            memberId,
            points: Math.abs(amount),
            transactionType: "spend",
            source: source || "admin_deduction",
            referenceType: "admin_deduction",
            referenceId: req.user!.id,
            metadata: { deductedBy: req.user!.id, adminEmail: req.user!.email, adminOverride: true }
          });

      res.json({ success: true, data: points });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to award points" });
    }
  });

  app.get("/api/points/category-leaderboard/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;

      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users
        })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.source, category))
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(50);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch category leaderboard" });
    }
  });

  // Achievement Endpoints
  app.get("/api/achievements", async (req: Request, res: Response) => {
    try {
      const achievements = await db.query.achievements.findMany({
        orderBy: [asc(schema.achievements.rarity), desc(schema.achievements.points)]
      });
      res.json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch achievements" });
    }
  });

  app.get("/api/achievements/my-achievements", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const userAchievements = await db.query.userAchievements.findMany({
        where: eq(schema.userAchievements.memberId, member.id),
        with: { achievement: true }
      });

      res.json({ success: true, data: userAchievements });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements/check", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const allAchievements = await db.query.achievements.findMany();
      const userAchievements = await db.query.userAchievements.findMany({
        where: eq(schema.userAchievements.memberId, member.id)
      });

      const newlyCompleted = [];

      for (const achievement of allAchievements) {
        const existing = userAchievements.find(ua => ua.achievementId === achievement.id);
        const requirement = achievement.requirement as { type: string; value: number };
        let progress = 0;

        switch (requirement.type) {
          case "tasks_completed": {
            progress = await db.$count(schema.taskCompletions, 
              and(
                eq(schema.taskCompletions.memberId, member.id),
                eq(schema.taskCompletions.status, "approved")
              )
            );
            break;
          }
          case "total_points": {
            const points = await db
              .select({ total: sql<number>`SUM(${schema.userPoints.amount})` })
              .from(schema.userPoints)
              .where(eq(schema.userPoints.memberId, member.id));
            progress = points[0]?.total || 0;
            break;
          }
        }

        const completed = progress >= requirement.value;

        if (!existing) {
          const [userAchievement] = await db.insert(schema.userAchievements).values({
            memberId: member.id,
            achievementId: achievement.id,
            progress,
            completed,
            completedAt: completed ? new Date() : null
          }).returning();

          if (completed) {
            const pointLedger = new PointLedgerService();
            await pointLedger.addPoints({
              memberId: member.id,
              points: achievement.points,
              transactionType: "earn",
              source: "achievement",
              referenceType: "achievement",
              referenceId: achievement.id,
              metadata: { achievementName: achievement.name, requirementType: requirement.type, progress }
            });
            newlyCompleted.push({ ...userAchievement, achievement });
          }
        } else if (!existing.completed && completed) {
          await db.update(schema.userAchievements)
            .set({ completed: true, completedAt: new Date(), progress })
            .where(eq(schema.userAchievements.id, existing.id));

          const pointLedger = new PointLedgerService();
          await pointLedger.addPoints({
            memberId: member.id,
            points: achievement.points,
            transactionType: "earn",
            source: "achievement",
            referenceType: "achievement",
            referenceId: achievement.id,
            metadata: { achievementName: achievement.name, requirementType: requirement.type, progress }
          });

          newlyCompleted.push({ ...existing, achievement, completed: true });
        } else {
          await db.update(schema.userAchievements)
            .set({ progress })
            .where(eq(schema.userAchievements.id, existing.id));
        }
      }

      res.json({ success: true, data: newlyCompleted });
    } catch (error) {
      console.error("Achievement check error:", error);
      res.status(500).json({ success: false, error: "Failed to check achievements" });
    }
  });

  // Enhanced Leaderboard Endpoints
  app.get("/api/leaderboard/global", async (req: Request, res: Response) => {
    try {
      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users,
          badgeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.userBadges} WHERE member_id = ${schema.userPoints.memberId})`
        })
        .from(schema.userPoints)
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(50);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch global leaderboard" });
    }
  });

  app.get("/api/leaderboard/state/:stateId", async (req: Request, res: Response) => {
    try {
      const { stateId } = req.params;

      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users
        })
        .from(schema.userPoints)
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .leftJoin(schema.wards, eq(schema.members.wardId, schema.wards.id))
        .leftJoin(schema.lgas, eq(schema.wards.lgaId, schema.lgas.id))
        .where(eq(schema.lgas.stateId, stateId))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(50);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch state leaderboard" });
    }
  });

  app.get("/api/leaderboard/timeframe/:period", async (req: Request, res: Response) => {
    try {
      const { period } = req.params;
      let dateFilter;

      switch (period) {
        case "week":
          dateFilter = sql`${schema.userPoints.createdAt} >= NOW() - INTERVAL '7 days'`;
          break;
        case "month":
          dateFilter = sql`${schema.userPoints.createdAt} >= NOW() - INTERVAL '30 days'`;
          break;
        case "year":
          dateFilter = sql`${schema.userPoints.createdAt} >= NOW() - INTERVAL '365 days'`;
          break;
        default:
          dateFilter = sql`1=1`;
      }

      const leaderboard = await db
        .select({
          memberId: schema.userPoints.memberId,
          totalPoints: sql<number>`SUM(${schema.userPoints.amount})`,
          member: schema.members,
          user: schema.users
        })
        .from(schema.userPoints)
        .where(dateFilter)
        .leftJoin(schema.members, eq(schema.userPoints.memberId, schema.members.id))
        .leftJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .groupBy(schema.userPoints.memberId, schema.members.id, schema.users.id)
        .orderBy(desc(sql`SUM(${schema.userPoints.amount})`))
        .limit(50);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch timeframe leaderboard" });
    }
  });

  // Ideas Endpoints
  app.get("/api/ideas", async (req: Request, res: Response) => {
    try {
      const { category, status, sortBy = "date", limit = "20", offset = "0" } = req.query;
      
      let query = db.query.ideas.findMany({
        with: {
          member: { with: { user: true } },
          votes: true,
          comments: { with: { member: { with: { user: true } } } }
        },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: sortBy === "votes" ? desc(schema.ideas.votesCount) : desc(schema.ideas.createdAt)
      });

      let ideas = await query;

      if (category) {
        ideas = ideas.filter(idea => idea.category === category);
      }

      if (status) {
        ideas = ideas.filter(idea => idea.status === status);
      }

      res.json({ success: true, data: ideas });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch ideas" });
    }
  });

  app.get("/api/ideas/:id", async (req: Request, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: {
          member: { with: { user: true } },
          votes: { with: { member: { with: { user: true } } } },
          comments: { 
            with: { member: { with: { user: true } } },
            orderBy: desc(schema.ideaComments.createdAt)
          }
        }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch idea" });
    }
  });

  app.post("/api/ideas", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const ideaData = schema.insertIdeaSchema.parse({
        ...req.body,
        memberId: member.id
      });

      const [idea] = await db.insert(schema.ideas).values(ideaData).returning();
      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create idea" });
    }
  });

  app.patch("/api/ideas/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: { member: { with: { user: true } } }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      const ideaMember = Array.isArray(idea.member) ? idea.member[0] : idea.member;
      const ideaUser = ideaMember && !Array.isArray(ideaMember.user) ? ideaMember.user : (Array.isArray(ideaMember?.user) ? ideaMember.user[0] : null);
      if (ideaUser?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      const [updated] = await db.update(schema.ideas)
        .set(req.body)
        .where(eq(schema.ideas.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update idea" });
    }
  });

  app.delete("/api/ideas/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const idea = await db.query.ideas.findFirst({
        where: eq(schema.ideas.id, req.params.id),
        with: { member: { with: { user: true } } }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      const ideaMember = Array.isArray(idea.member) ? idea.member[0] : idea.member;
      const ideaUser = ideaMember && !Array.isArray(ideaMember.user) ? ideaMember.user : (Array.isArray(ideaMember?.user) ? ideaMember.user[0] : null);
      if (ideaUser?.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      await db.delete(schema.ideas).where(eq(schema.ideas.id, req.params.id));
      res.json({ success: true, data: { message: "Idea deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete idea" });
    }
  });

  app.post("/api/ideas/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const { voteType } = req.body;

      if (!["upvote", "downvote"].includes(voteType)) {
        return res.status(400).json({ success: false, error: "Invalid vote type" });
      }

      const existingVote = await db.query.ideaVotes.findFirst({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.memberId, member.id)
        )
      });

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          return res.status(400).json({ success: false, error: "Already voted" });
        }
        await db.delete(schema.ideaVotes).where(eq(schema.ideaVotes.id, existingVote.id));
      }

      const [vote] = await db.insert(schema.ideaVotes).values({
        ideaId: req.params.id,
        memberId: member.id,
        voteType
      }).returning();

      const upvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "upvote")
        )
      });

      const downvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "downvote")
        )
      });

      await db.update(schema.ideas)
        .set({ votesCount: upvotes.length - downvotes.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: vote });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to vote on idea" });
    }
  });

  app.delete("/api/ideas/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const vote = await db.query.ideaVotes.findFirst({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.memberId, member.id)
        )
      });

      if (!vote) {
        return res.status(404).json({ success: false, error: "Vote not found" });
      }

      await db.delete(schema.ideaVotes).where(eq(schema.ideaVotes.id, vote.id));

      const upvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "upvote")
        )
      });

      const downvotes = await db.query.ideaVotes.findMany({
        where: and(
          eq(schema.ideaVotes.ideaId, req.params.id),
          eq(schema.ideaVotes.voteType, "downvote")
        )
      });

      await db.update(schema.ideas)
        .set({ votesCount: upvotes.length - downvotes.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: { message: "Vote removed successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to remove vote" });
    }
  });

  app.post("/api/ideas/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const commentData = schema.insertIdeaCommentSchema.parse({
        ...req.body,
        ideaId: req.params.id,
        memberId: member.id
      });

      const [comment] = await db.insert(schema.ideaComments).values(commentData).returning();

      const commentsCount = await db.query.ideaComments.findMany({
        where: eq(schema.ideaComments.ideaId, req.params.id)
      });

      await db.update(schema.ideas)
        .set({ commentsCount: commentsCount.length })
        .where(eq(schema.ideas.id, req.params.id));

      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to add comment" });
    }
  });

  app.patch("/api/ideas/:id/status", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body;

      if (!["pending", "under_review", "approved", "rejected", "implemented"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
      }

      const [idea] = await db.update(schema.ideas)
        .set({ status })
        .where(eq(schema.ideas.id, req.params.id))
        .returning();

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      res.json({ success: true, data: idea });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update idea status" });
    }
  });

  // Knowledge Base Endpoints
  app.get("/api/knowledge/categories", async (req: Request, res: Response) => {
    try {
      const categories = await db.query.knowledgeCategories.findMany({
        orderBy: asc(schema.knowledgeCategories.order)
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch categories" });
    }
  });

  app.post("/api/knowledge/categories", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const categoryData = schema.insertKnowledgeCategorySchema.parse(req.body);
      const [category] = await db.insert(schema.knowledgeCategories).values(categoryData).returning();
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create category" });
    }
  });

  app.patch("/api/knowledge/categories/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [category] = await db.update(schema.knowledgeCategories)
        .set(req.body)
        .where(eq(schema.knowledgeCategories.id, req.params.id))
        .returning();

      if (!category) {
        return res.status(404).json({ success: false, error: "Category not found" });
      }

      res.json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update category" });
    }
  });

  app.delete("/api/knowledge/categories/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const articles = await db.query.knowledgeArticles.findMany({
        where: eq(schema.knowledgeArticles.categoryId, req.params.id)
      });

      if (articles.length > 0) {
        return res.status(400).json({ success: false, error: "Cannot delete category with articles" });
      }

      await db.delete(schema.knowledgeCategories).where(eq(schema.knowledgeCategories.id, req.params.id));
      res.json({ success: true, data: { message: "Category deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete category" });
    }
  });

  app.get("/api/knowledge/articles", async (req: Request, res: Response) => {
    try {
      const { category, published, limit = "20", offset = "0" } = req.query;

      let articles = await db.query.knowledgeArticles.findMany({
        with: {
          category: true,
          author: true
        },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: desc(schema.knowledgeArticles.createdAt)
      });

      if (category) {
        articles = articles.filter(article => article.categoryId === category);
      }

      if (published !== undefined) {
        const isPublished = published === "true";
        articles = articles.filter(article => article.published === isPublished);
      }

      res.json({ success: true, data: articles });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch articles" });
    }
  });

  app.get("/api/knowledge/articles/:slug", async (req: Request, res: Response) => {
    try {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(schema.knowledgeArticles.slug, req.params.slug),
        with: {
          category: true,
          author: true,
          feedback: true
        }
      });

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      res.json({ success: true, data: article });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch article" });
    }
  });

  app.post("/api/knowledge/articles", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const articleData = schema.insertKnowledgeArticleSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });

      const [article] = await db.insert(schema.knowledgeArticles).values(articleData).returning();
      res.json({ success: true, data: article });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create article" });
    }
  });

  app.patch("/api/knowledge/articles/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [article] = await db.update(schema.knowledgeArticles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(schema.knowledgeArticles.id, req.params.id))
        .returning();

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      res.json({ success: true, data: article });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update article" });
    }
  });

  app.delete("/api/knowledge/articles/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.knowledgeArticles).where(eq(schema.knowledgeArticles.id, req.params.id));
      res.json({ success: true, data: { message: "Article deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete article" });
    }
  });

  app.post("/api/knowledge/articles/:id/view", async (req: Request, res: Response) => {
    try {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(schema.knowledgeArticles.id, req.params.id)
      });

      if (!article) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      await db.update(schema.knowledgeArticles)
        .set({ viewsCount: (article.viewsCount || 0) + 1 })
        .where(eq(schema.knowledgeArticles.id, req.params.id));

      res.json({ success: true, data: { message: "View count incremented" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to increment view count" });
    }
  });

  app.post("/api/knowledge/articles/:id/feedback", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const { helpful } = req.body;

      const existingFeedback = await db.query.articleFeedback.findFirst({
        where: and(
          eq(schema.articleFeedback.articleId, req.params.id),
          eq(schema.articleFeedback.memberId, member.id)
        )
      });

      if (existingFeedback) {
        await db.delete(schema.articleFeedback).where(eq(schema.articleFeedback.id, existingFeedback.id));
      }

      const [feedback] = await db.insert(schema.articleFeedback).values({
        articleId: req.params.id,
        memberId: member.id,
        helpful
      }).returning();

      const allFeedback = await db.query.articleFeedback.findMany({
        where: eq(schema.articleFeedback.articleId, req.params.id)
      });

      const helpfulCount = allFeedback.filter(f => f.helpful).length;

      await db.update(schema.knowledgeArticles)
        .set({ helpfulCount })
        .where(eq(schema.knowledgeArticles.id, req.params.id));

      res.json({ success: true, data: feedback });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to submit feedback" });
    }
  });

  app.get("/api/knowledge/faqs", async (req: Request, res: Response) => {
    try {
      const { category, published, limit = "50", offset = "0" } = req.query;

      let faqs = await db.query.faqs.findMany({
        with: { category: true },
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: asc(schema.faqs.order)
      });

      if (category) {
        faqs = faqs.filter(faq => faq.categoryId === category);
      }

      if (published !== undefined) {
        const isPublished = published === "true";
        faqs = faqs.filter(faq => faq.published === isPublished);
      }

      res.json({ success: true, data: faqs });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/knowledge/faqs", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const faqData = schema.insertFaqSchema.parse(req.body);
      const [faq] = await db.insert(schema.faqs).values(faqData).returning();
      res.json({ success: true, data: faq });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create FAQ" });
    }
  });

  app.patch("/api/knowledge/faqs/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [faq] = await db.update(schema.faqs)
        .set(req.body)
        .where(eq(schema.faqs.id, req.params.id))
        .returning();

      if (!faq) {
        return res.status(404).json({ success: false, error: "FAQ not found" });
      }

      res.json({ success: true, data: faq });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update FAQ" });
    }
  });

  app.delete("/api/knowledge/faqs/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.faqs).where(eq(schema.faqs.id, req.params.id));
      res.json({ success: true, data: { message: "FAQ deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete FAQ" });
    }
  });

  app.get("/api/knowledge/search", async (req: Request, res: Response) => {
    try {
      const { q, limit = "20" } = req.query;

      if (!q) {
        return res.status(400).json({ success: false, error: "Search query required" });
      }

      const searchQuery = (q as string).toLowerCase();

      const articles = await db.query.knowledgeArticles.findMany({
        with: { category: true, author: true },
        limit: parseInt(limit as string)
      });

      const faqs = await db.query.faqs.findMany({
        with: { category: true },
        limit: parseInt(limit as string)
      });

      const matchedArticles = articles.filter(article => 
        article.title.toLowerCase().includes(searchQuery) ||
        article.content.toLowerCase().includes(searchQuery) ||
        (article.summary && article.summary.toLowerCase().includes(searchQuery))
      );

      const matchedFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery) ||
        faq.answer.toLowerCase().includes(searchQuery)
      );

      res.json({
        success: true,
        data: {
          articles: matchedArticles,
          faqs: matchedFaqs
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Search failed" });
    }
  });

  // Donation Campaign Endpoints
  app.get("/api/donation-campaigns", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const campaigns = await db.query.donationCampaigns.findMany({
        where: status ? eq(schema.donationCampaigns.status, status as any) : undefined,
        with: {
          creator: {
            columns: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: desc(schema.donationCampaigns.createdAt)
      });

      res.json({ success: true, data: campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/donation-campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaign = await db.query.donationCampaigns.findFirst({
        where: eq(schema.donationCampaigns.id, req.params.id),
        with: {
          creator: {
            columns: {
              firstName: true,
              lastName: true,
            }
          },
          donations: {
            where: eq(schema.donations.paymentStatus, "completed"),
            orderBy: desc(schema.donations.createdAt),
            limit: 10,
          }
        }
      });

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/donation-campaigns", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const campaignData = schema.insertDonationCampaignSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });

      const [campaign] = await db.insert(schema.donationCampaigns)
        .values(campaignData)
        .returning();

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Failed to create campaign" });
    }
  });

  app.patch("/api/donation-campaigns/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body;
      delete updates.id;
      delete updates.createdAt;
      delete updates.createdBy;
      
      updates.updatedAt = new Date();

      const [campaign] = await db.update(schema.donationCampaigns)
        .set(updates)
        .where(eq(schema.donationCampaigns.id, req.params.id))
        .returning();

      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      res.json({ success: true, data: campaign });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to update campaign" });
    }
  });

  app.delete("/api/donation-campaigns/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.donationCampaigns)
        .where(eq(schema.donationCampaigns.id, req.params.id));

      res.json({ success: true, data: { message: "Campaign deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete campaign" });
    }
  });

  // Donation Endpoints
  app.post("/api/donations/create", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, campaignId, isAnonymous, message } = req.body;
      const member_id = req.user!.id;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, member_id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const tx_ref = `don_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const [donation] = await db.insert(schema.donations).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        campaignId: campaignId || null,
        amount: amount * 100,
        currency: "NGN",
        paymentMethod: "flutterwave",
        paymentStatus: "pending",
        isAnonymous: isAnonymous || false,
        message: message || null,
      }).returning();

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      
      // Initialize Flutterwave payment
      const flwPayload = {
        tx_ref,
        amount,
        currency: "NGN",
        redirect_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/donations`,
        payment_options: "card,banktransfer,ussd,account",
        customer: {
          email: user?.email || "",
          name: `${user?.firstName} ${user?.lastName}`,
        },
        customizations: {
          title: "APC Connect - Donation",
          description: campaignId ? "Campaign donation" : "General donation",
          logo: `${process.env.VITE_APP_URL || 'http://localhost:5000'}/logo.png`,
        },
        meta: {
          donation_id: donation.id,
          campaign_id: campaignId || null,
          member_id: member.id,
        },
      };

      const flwResponse = await fetch(`${FLW_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flwPayload),
      });

      const flwData = await flwResponse.json();

      if (flwData.status !== 'success') {
        throw new Error(flwData.message || "Failed to initialize payment");
      }

      // Update donation record with Flutterwave reference
      await db.update(schema.donations)
        .set({ paystackReference: tx_ref })
        .where(eq(schema.donations.id, donation.id));

      res.json({
        success: true,
        data: {
          authorization_url: flwData.data.link,
          access_code: flwData.data.link,
          reference: tx_ref,
        }
      });
    } catch (error: any) {
      console.error("Donation creation error:", error);
      res.status(500).json({ success: false, error: "Failed to create donation" });
    }
  });

  app.post("/api/donations/verify", async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      // Verify with Flutterwave
      const flwVerifyResponse = await fetch(
        `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          },
        }
      );

      const verification = await flwVerifyResponse.json();

      if (verification.status === 'success' && verification.data.status === "successful") {
        // Find donation by Flutterwave reference
        const donation = await db.query.donations.findFirst({
          where: eq(schema.donations.paystackReference, reference)
        });

        if (!donation) {
          return res.status(404).json({ success: false, error: "Donation not found" });
        }

        await db.update(schema.donations)
          .set({
            paymentStatus: "completed",
          })
          .where(eq(schema.donations.id, donation.id));

        // Update campaign progress if campaign donation
        if (donation.campaignId) {
          const campaign = await db.query.donationCampaigns.findFirst({
            where: eq(schema.donationCampaigns.id, donation.campaignId)
          });

          if (campaign) {
            await db.update(schema.donationCampaigns)
              .set({
                currentAmount: (campaign.currentAmount || 0) + donation.amount
              })
              .where(eq(schema.donationCampaigns.id, donation.campaignId));
          }
        }

        const updatedDonation = await db.query.donations.findFirst({
          where: eq(schema.donations.id, reference)
        });

        if (donation && donation.campaignId) {
          await db.update(schema.donationCampaigns)
            .set({
              currentAmount: sql`current_amount + ${donation.amount}`,
            })
            .where(eq(schema.donationCampaigns.id, donation.campaignId));
        }

        res.json({ success: true, data: { donation } });
      } else {
        await db.update(schema.donations)
          .set({ paymentStatus: "failed" })
          .where(eq(schema.donations.id, reference));

        res.status(400).json({ success: false, error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  app.get("/api/donations", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const donations = await db.query.donations.findMany({
        where: eq(schema.donations.memberId, member.id),
        with: {
          campaign: true
        },
        orderBy: desc(schema.donations.createdAt)
      });

      res.json({ success: true, data: donations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donations" });
    }
  });

  app.get("/api/donations/recent", async (req: Request, res: Response) => {
    try {
      const { limit = "10" } = req.query;

      const donations = await db.query.donations.findMany({
        where: eq(schema.donations.paymentStatus, "completed"),
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          campaign: {
            columns: {
              title: true,
            }
          }
        },
        orderBy: desc(schema.donations.createdAt),
        limit: parseInt(limit as string)
      });

      const publicDonations = donations.map(donation => {
        const campaign = Array.isArray(donation.campaign) ? donation.campaign[0] : donation.campaign;
        const member = Array.isArray(donation.member) ? donation.member[0] : donation.member;
        const user = member && !Array.isArray(member.user) ? member.user : (Array.isArray(member?.user) ? member.user[0] : null);
        
        return {
          id: donation.id,
          amount: donation.amount,
          campaignTitle: campaign?.title || "General Fund",
          donorName: donation.isAnonymous 
            ? "Anonymous" 
            : donation.donorName || (user ? `${user.firstName} ${user.lastName}` : "Anonymous"),
          message: donation.message,
          createdAt: donation.createdAt,
        };
      });

      res.json({ success: true, data: publicDonations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch recent donations" });
    }
  });

  app.get("/api/donations/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const donation = await db.query.donations.findFirst({
        where: eq(schema.donations.id, req.params.id),
        with: {
          campaign: true,
          member: {
            with: { user: true }
          }
        }
      });

      if (!donation) {
        return res.status(404).json({ success: false, error: "Donation not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (donation.memberId !== member?.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      res.json({ success: true, data: donation });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donation" });
    }
  });

  app.post("/api/recurring-donations/:id/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const recurring = await db.query.recurringDonations.findFirst({
        where: eq(schema.recurringDonations.id, req.params.id)
      });

      if (!recurring) {
        return res.status(404).json({ success: false, error: "Recurring donation not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (recurring.memberId !== member?.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      // Note: Paystack handles recurring donations differently than Stripe subscriptions.
      // With Paystack, we initiate charges on the nextPaymentDate, so cancellation
      // simply means updating our database to stop initiating future charges.
      // No Paystack API call needed for cancellation.

      const [updated] = await db.update(schema.recurringDonations)
        .set({ 
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(schema.recurringDonations.id, req.params.id))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel recurring donation" });
    }
  });

  // Admin Donation Endpoints
  app.get("/api/admin/donations", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { status, campaignId, startDate, endDate } = req.query;

      let whereConditions: any[] = [];
      
      if (status) {
        whereConditions.push(eq(schema.donations.paymentStatus, status as any));
      }
      if (campaignId) {
        whereConditions.push(eq(schema.donations.campaignId, campaignId as string));
      }
      if (startDate) {
        whereConditions.push(gte(schema.donations.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        whereConditions.push(lte(schema.donations.createdAt, new Date(endDate as string)));
      }

      const donations = await db.query.donations.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          campaign: true
        },
        orderBy: desc(schema.donations.createdAt)
      });

      res.json({ success: true, data: donations });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donations" });
    }
  });

  app.get("/api/admin/donations/stats", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.query;

      const completedConditions = [eq(schema.donations.paymentStatus, "completed")];
      if (campaignId) {
        completedConditions.push(eq(schema.donations.campaignId, campaignId as string));
      }

      const totalRaised = await db
        .select({ sum: sql<number>`COALESCE(SUM(${schema.donations.amount}), 0)` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const donorCount = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${schema.donations.memberId})` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const donationCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.donations)
        .where(and(...completedConditions));

      const recurringCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.recurringDonations)
        .where(eq(schema.recurringDonations.status, "active"));

      const averageDonation = totalRaised[0].sum > 0 
        ? Math.round(totalRaised[0].sum / donationCount[0].count)
        : 0;

      res.json({
        success: true,
        data: {
          totalRaised: totalRaised[0].sum,
          donorCount: donorCount[0].count,
          donationCount: donationCount[0].count,
          recurringDonationsActive: recurringCount[0].count,
          averageDonation,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch donation stats" });
    }
  });

  app.post("/api/admin/donations/:id/refund", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const donation = await db.query.donations.findFirst({
        where: eq(schema.donations.id, req.params.id)
      });

      if (!donation) {
        return res.status(404).json({ success: false, error: "Donation not found" });
      }

      if (donation.paymentStatus !== "completed") {
        return res.status(400).json({ success: false, error: "Can only refund completed donations" });
      }

      // Process Flutterwave refund if payment was via Flutterwave
      if ((donation.paymentMethod === "flutterwave" || donation.paymentMethod === "paystack") && donation.paystackReference) {
        try {
          // First, get transaction ID from reference
          const verifyResponse = await fetch(`${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${donation.paystackReference}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
          });

          const verifyData = await verifyResponse.json();
          
          if (verifyData.status !== 'success') {
            throw new Error('Could not verify transaction for refund');
          }

          const transactionId = verifyData.data.id;

          // Now process refund using transaction ID
          const refundResponse = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/refund`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FLW_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: donation.amount,
            }),
          });

          const refundData = await refundResponse.json();

          if (refundData.status !== 'success') {
            throw new Error(refundData.message || 'Refund failed');
          }
        } catch (refundError: any) {
          console.error("Flutterwave refund error:", refundError);
          return res.status(400).json({ success: false, error: "Refund failed: " + refundError.message });
        }
      } else if (donation.paymentMethod !== "flutterwave" && donation.paymentMethod !== "paystack") {
        // For bank transfers or other payment methods, manual refund required
        return res.status(400).json({ 
          success: false, 
          error: "Automated refunds only available for Flutterwave payments. Please process manual refund." 
        });
      } else {
        return res.status(400).json({ success: false, error: "No payment reference found for refund" });
      }

      const [updated] = await db.update(schema.donations)
        .set({ paymentStatus: "refunded" })
        .where(eq(schema.donations.id, req.params.id))
        .returning();

      if (donation.campaignId) {
        await db.update(schema.donationCampaigns)
          .set({ 
            currentAmount: sql`GREATEST(${schema.donationCampaigns.currentAmount} - ${donation.amount}, 0)` 
          })
          .where(eq(schema.donationCampaigns.id, donation.campaignId));
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({ success: false, error: "Failed to process refund" });
    }
  });

  // Chatbot Endpoints
  app.post("/api/chatbot/conversations", async (req: Request, res: Response) => {
    try {
      const { memberId, sessionId } = req.body;
      const [conversation] = await db.insert(schema.chatbotConversations)
        .values({ memberId, sessionId })
        .returning();
      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to create conversation" });
    }
  });

  app.get("/api/chatbot/conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await db.query.chatbotConversations.findFirst({
        where: eq(schema.chatbotConversations.id, req.params.id),
        with: {
          messages: {
            orderBy: asc(schema.chatbotMessages.createdAt)
          }
        }
      });

      if (!conversation) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      res.json({ success: true, data: conversation });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/chatbot/message", async (req: AuthRequest, res: Response) => {
    try {
      const { conversation_id, message, session_id } = req.body;
      
      let memberId = null;
      let memberContext = "";

      if (req.isAuthenticated() && req.user) {
        const member = await db.query.members.findFirst({
          where: eq(schema.members.userId, req.user.id),
          with: {
            user: true,
            ward: {
              with: {
                lga: {
                  with: { state: true }
                }
              }
            }
          }
        });

        if (member) {
          memberId = member.id;
          const user = Array.isArray(member.user) ? member.user[0] : member.user;
          const ward = Array.isArray(member.ward) ? member.ward[0] : member.ward;
          const lga = ward && !Array.isArray(ward.lga) ? ward.lga : (Array.isArray(ward?.lga) ? ward.lga[0] : null);
          const state = lga && !Array.isArray(lga.state) ? lga.state : (Array.isArray(lga?.state) ? lga.state[0] : null);
          memberContext = `\n\nContext: You are speaking with ${user?.firstName} ${user?.lastName}, an APC member from ${ward?.name || 'Nigeria'}, ${lga?.name || ''}, ${state?.name || ''}. Personalize your responses when relevant.`;
        }
      }

      let conversation;
      if (conversation_id) {
        conversation = await db.query.chatbotConversations.findFirst({
          where: eq(schema.chatbotConversations.id, conversation_id)
        });
      }
      
      if (!conversation) {
        [conversation] = await db.insert(schema.chatbotConversations).values({
          memberId,
          sessionId: session_id || crypto.randomUUID(),
        }).returning();
      }

      await db.insert(schema.chatbotMessages).values({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });

      const history = await db.query.chatbotMessages.findMany({
        where: eq(schema.chatbotMessages.conversationId, conversation.id),
        orderBy: desc(schema.chatbotMessages.createdAt),
        limit: 10
      });

      let knowledgeContext = "";
      
      try {
        const searchPattern = `%${message}%`;
        
        const relevantFacts = await db.query.politicalFacts.findMany({
          where: sql`${schema.politicalFacts.content} ILIKE ${searchPattern} OR ${schema.politicalFacts.category} ILIKE ${searchPattern}`,
          limit: 3,
          orderBy: desc(schema.politicalFacts.year),
        });

        const relevantQuotes = await db.query.politicalQuotes.findMany({
          where: sql`${schema.politicalQuotes.content} ILIKE ${searchPattern} OR ${schema.politicalQuotes.speaker} ILIKE ${searchPattern} OR ${schema.politicalQuotes.category} ILIKE ${searchPattern}`,
          limit: 2,
          orderBy: desc(schema.politicalQuotes.year),
        });

        if (relevantFacts.length > 0 || relevantQuotes.length > 0) {
          knowledgeContext += "\n\nRelevant Knowledge Base Information:";
          
          if (relevantFacts.length > 0) {
            knowledgeContext += "\n\nFacts:";
            relevantFacts.forEach((fact, idx) => {
              knowledgeContext += `\n${idx + 1}. ${fact.content} (Source: ${fact.source}, ${fact.year})`;
            });
          }
          
          if (relevantQuotes.length > 0) {
            knowledgeContext += "\n\nQuotes:";
            relevantQuotes.forEach((quote, idx) => {
              knowledgeContext += `\n${idx + 1}. "${quote.content}" - ${quote.speaker}, ${quote.position} (${quote.year})`;
            });
          }
          
          knowledgeContext += "\n\nYou can reference these facts and quotes in your response when relevant. Always cite sources when using this information.";
        }
      } catch (error) {
        console.error("Knowledge base search error:", error);
      }

      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant for APC Connect, a political engagement platform for Nigeria's All Progressives Congress (APC). 

Your role is to help users understand:
- How to use the APC Connect platform
- APC party policies and positions
- Nigerian politics and governance
- Democratic participation and civic engagement
- Platform features like elections, campaigns, events, and volunteer tasks

Be friendly, informative, and politically neutral when discussing governance. Encourage democratic participation and civic engagement. Keep responses concise and helpful.${memberContext}${knowledgeContext}`
        },
        ...history.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

      await db.insert(schema.chatbotMessages).values({
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        success: true,
        data: {
          conversation_id: conversation.id,
          message: aiResponse,
        }
      });

    } catch (error: any) {
      console.error('Chatbot error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  });

  app.get("/api/chatbot/suggestions", (req: Request, res: Response) => {
    const suggestions = [
      "How do I register as an APC member?",
      "What are the current elections I can vote in?",
      "How does the volunteer task system work?",
      "What are APC's key policies?",
      "How can I submit a policy idea?",
      "How do I pay my membership dues?",
      "What badges can I earn on the platform?",
      "How does the political literacy quiz work?",
    ];
    
    res.json({ success: true, data: suggestions });
  });

  // Knowledge Base API Routes
  app.get("/api/knowledge/facts", async (req: Request, res: Response) => {
    try {
      const { category, subcategory, year, search, limit = "50", offset = "0" } = req.query;
      
      let whereConditions: any[] = [];
      
      if (category) {
        whereConditions.push(eq(schema.politicalFacts.category, category as string));
      }
      if (subcategory) {
        whereConditions.push(eq(schema.politicalFacts.subcategory, subcategory as string));
      }
      if (year) {
        whereConditions.push(eq(schema.politicalFacts.year, parseInt(year as string)));
      }
      if (search) {
        whereConditions.push(
          sql`${schema.politicalFacts.content} ILIKE ${`%${search}%`} OR ${schema.politicalFacts.source} ILIKE ${`%${search}%`}`
        );
      }

      const facts = await db.query.politicalFacts.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        orderBy: desc(schema.politicalFacts.year),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.politicalFacts)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      res.json({
        success: true,
        data: facts,
        pagination: {
          total: Number(totalCount[0]?.count || 0),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Facts fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch facts" });
    }
  });

  app.get("/api/knowledge/quotes", async (req: Request, res: Response) => {
    try {
      const { category, speaker, year, search, limit = "50", offset = "0" } = req.query;
      
      let whereConditions: any[] = [];
      
      if (category) {
        whereConditions.push(eq(schema.politicalQuotes.category, category as string));
      }
      if (speaker) {
        whereConditions.push(
          sql`${schema.politicalQuotes.speaker} ILIKE ${`%${speaker}%`}`
        );
      }
      if (year) {
        whereConditions.push(eq(schema.politicalQuotes.year, parseInt(year as string)));
      }
      if (search) {
        whereConditions.push(
          sql`${schema.politicalQuotes.content} ILIKE ${`%${search}%`} OR ${schema.politicalQuotes.speaker} ILIKE ${`%${search}%`} OR ${schema.politicalQuotes.context} ILIKE ${`%${search}%`}`
        );
      }

      const quotes = await db.query.politicalQuotes.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        orderBy: desc(schema.politicalQuotes.year),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.politicalQuotes)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      res.json({
        success: true,
        data: quotes,
        pagination: {
          total: Number(totalCount[0]?.count || 0),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Quotes fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/knowledge/search", async (req: Request, res: Response) => {
    try {
      const { q, limit = "20" } = req.query;
      
      if (!q || typeof q !== "string") {
        return res.status(400).json({ success: false, error: "Search query required" });
      }

      const searchPattern = `%${q}%`;

      const facts = await db.query.politicalFacts.findMany({
        where: sql`${schema.politicalFacts.content} ILIKE ${searchPattern} OR ${schema.politicalFacts.source} ILIKE ${searchPattern}`,
        orderBy: desc(schema.politicalFacts.year),
        limit: Math.floor(parseInt(limit as string) / 2),
      });

      const quotes = await db.query.politicalQuotes.findMany({
        where: sql`${schema.politicalQuotes.content} ILIKE ${searchPattern} OR ${schema.politicalQuotes.speaker} ILIKE ${searchPattern}`,
        orderBy: desc(schema.politicalQuotes.year),
        limit: Math.floor(parseInt(limit as string) / 2),
      });

      res.json({
        success: true,
        data: {
          facts: facts.map(f => ({ ...f, type: "fact" })),
          quotes: quotes.map(q => ({ ...q, type: "quote" })),
          totalResults: facts.length + quotes.length,
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ success: false, error: "Failed to search knowledge base" });
    }
  });

  app.get("/api/knowledge/random", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      if (type === "fact" || !type) {
        const randomFact = await db.query.politicalFacts.findFirst({
          orderBy: sql`RANDOM()`,
        });
        if (randomFact) {
          return res.json({ success: true, data: { ...randomFact, type: "fact" } });
        }
      }
      
      if (type === "quote" || !type) {
        const randomQuote = await db.query.politicalQuotes.findFirst({
          orderBy: sql`RANDOM()`,
        });
        if (randomQuote) {
          return res.json({ success: true, data: { ...randomQuote, type: "quote" } });
        }
      }

      res.status(404).json({ success: false, error: "No knowledge items found" });
    } catch (error) {
      console.error("Random fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch random item" });
    }
  });

  app.get("/api/admin/chatbot/conversations", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, userType, limit = "50", offset = "0" } = req.query;

      let whereConditions: any[] = [];
      
      if (startDate) {
        whereConditions.push(gte(schema.chatbotConversations.createdAt, new Date(startDate as string)));
      }
      if (endDate) {
        whereConditions.push(lte(schema.chatbotConversations.createdAt, new Date(endDate as string)));
      }
      if (userType === "member") {
        whereConditions.push(sql`${schema.chatbotConversations.memberId} IS NOT NULL`);
      } else if (userType === "anonymous") {
        whereConditions.push(sql`${schema.chatbotConversations.memberId} IS NULL`);
      }

      const conversations = await db.query.chatbotConversations.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          messages: {
            orderBy: asc(schema.chatbotMessages.createdAt)
          }
        },
        orderBy: desc(schema.chatbotConversations.createdAt),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      const conversationsWithCount = conversations.map(conv => ({
        ...conv,
        messagesCount: conv.messages.length,
        lastMessageAt: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].createdAt : conv.createdAt
      }));

      res.json({ success: true, data: conversationsWithCount });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/admin/chatbot/stats", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const totalConversations = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.chatbotConversations);

      const totalMessages = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.chatbotMessages);

      const memberConversations = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.chatbotConversations)
        .where(sql`${schema.chatbotConversations.memberId} IS NOT NULL`);

      const anonymousConversations = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.chatbotConversations)
        .where(sql`${schema.chatbotConversations.memberId} IS NULL`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const conversationsToday = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(schema.chatbotConversations)
        .where(gte(schema.chatbotConversations.createdAt, today));

      const avgMessages = totalConversations[0].count > 0 
        ? Math.round(totalMessages[0].count / totalConversations[0].count)
        : 0;

      res.json({
        success: true,
        data: {
          totalConversations: totalConversations[0].count,
          totalMessages: totalMessages[0].count,
          memberConversations: memberConversations[0].count,
          anonymousConversations: anonymousConversations[0].count,
          conversationsToday: conversationsToday[0].count,
          avgMessagesPerConversation: avgMessages,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch chatbot stats" });
    }
  });

  // ============== COMPREHENSIVE TASK SYSTEM ROUTES ==============

  // MICRO-TASKS ROUTES
  app.get("/api/tasks/micro", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: {
          ward: {
            with: {
              lga: {
                with: {
                  state: true
                }
              }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const memberWardId = member.wardId;
      const memberLgaId = member.ward?.lgaId;
      const memberStateId = member.ward?.lga?.stateId;

      const { taskCategory, taskScope: queriedScope } = req.query;

      const now = new Date();

      const tasks = await db.query.microTasks.findMany({
        where: and(
          eq(schema.microTasks.isActive, true),
          drizzleOr(
            drizzleIsNull(schema.microTasks.expiresAt),
            gte(schema.microTasks.expiresAt, now)
          ),
          drizzleOr(
            sql`${schema.microTasks.maxCompletionsTotal} IS NULL`,
            sql`${schema.microTasks.currentCompletions} < ${schema.microTasks.maxCompletionsTotal}`
          ),
          drizzleOr(
            eq(schema.microTasks.taskScope, "national"),
            and(
              drizzleIsNull(schema.microTasks.stateId),
              drizzleIsNull(schema.microTasks.lgaId),
              drizzleIsNull(schema.microTasks.wardId)
            ),
            ...(memberStateId ? [and(eq(schema.microTasks.taskScope, "state"), eq(schema.microTasks.stateId, memberStateId))] : []),
            ...(memberLgaId ? [and(eq(schema.microTasks.taskScope, "lga"), eq(schema.microTasks.lgaId, memberLgaId))] : []),
            ...(memberWardId ? [and(eq(schema.microTasks.taskScope, "ward"), eq(schema.microTasks.wardId, memberWardId))] : [])
          ),
          ...(taskCategory && typeof taskCategory === "string" ? [eq(schema.microTasks.taskCategory, taskCategory as any)] : []),
          ...(queriedScope && typeof queriedScope === "string" ? [eq(schema.microTasks.taskScope, queriedScope as any)] : [])
        ),
        with: {
          state: true,
          lga: true,
          ward: true,
        },
        orderBy: desc(schema.microTasks.createdAt)
      });

      const completions = await db.query.taskCompletions.findMany({
        where: and(
          eq(schema.taskCompletions.memberId, member.id),
          eq(schema.taskCompletions.taskType, "micro")
        )
      });

      const completionMap = new Map(completions.map(c => [c.taskId, c]));
      
      const tasksWithCompletion = tasks.map(task => ({
        ...task,
        completed: completionMap.has(task.id),
        completion: completionMap.get(task.id)
      }));

      res.json({ success: true, data: tasksWithCompletion });
    } catch (error) {
      console.error("Fetch micro-tasks error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch micro-tasks" });
    }
  });

  app.get("/api/tasks/micro/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const task = await db.query.microTasks.findFirst({
        where: eq(schema.microTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Micro-task not found" });
      }

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch micro-task" });
    }
  });

  app.post("/api/tasks/micro", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const taskData = schema.insertMicroTaskSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      const [task] = await db.insert(schema.microTasks).values([taskData as any]).returning();
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Create micro-task error:", error);
      res.status(500).json({ success: false, error: "Failed to create micro-task" });
    }
  });

  app.post("/api/tasks/micro/:id/complete", requireAuth, taskLimiter, taskAntiCheat, upload.single("proofImage"), async (req: AuthRequest, res: Response) => {
    try {
      const { selectedAnswers } = req.body;
      const antiCheatData = (req as any).antiCheat;
      
      if (!antiCheatData) {
        return res.status(403).json({ success: false, error: "Security validation failed" });
      }

      const { memberId, ipAddress, userAgent, fingerprint } = antiCheatData;

      // Verify unique task completion
      const uniqueCheck = await antiCheatService.verifyUniqueTaskCompletion(memberId, req.params.id, "micro");
      if (!uniqueCheck.valid) {
        return res.status(400).json({ success: false, error: uniqueCheck.error });
      }

      const task = await db.query.microTasks.findFirst({
        where: eq(schema.microTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      if (!task.isActive) {
        return res.status(400).json({ success: false, error: "Task is no longer active" });
      }

      if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, error: "Task has expired" });
      }

      if (task.maxCompletionsTotal && (task.currentCompletions || 0) >= task.maxCompletionsTotal) {
        return res.status(400).json({ success: false, error: "Task has reached maximum completions" });
      }

      if (task.cooldownHours && task.cooldownHours > 0) {
        const cooldownCutoff = new Date(Date.now() - task.cooldownHours * 60 * 60 * 1000);
        const recentCompletion = await db.query.taskCompletions.findFirst({
          where: and(
            eq(schema.taskCompletions.memberId, memberId),
            eq(schema.taskCompletions.taskType, "micro"),
            gte(schema.taskCompletions.completedAt, cooldownCutoff)
          ),
          orderBy: desc(schema.taskCompletions.completedAt)
        });
        if (recentCompletion) {
          const waitHours = task.cooldownHours;
          return res.status(400).json({ success: false, error: `Please wait ${waitHours} hours between task completions` });
        }
      }

      const completionRequirement = task.completionRequirement || "quiz";
      let proofUrl: string | null = null;
      let status = "pending";
      let pointsEarned = 0;
      let isCorrect = false;

      // Handle quiz-type tasks
      if (completionRequirement === "quiz") {
        const correctAnswers = task.correctAnswers as number[] || [];
        isCorrect = JSON.stringify(selectedAnswers?.sort()) === JSON.stringify(correctAnswers.sort());
        pointsEarned = isCorrect ? task.points : 0;
        status = isCorrect ? "approved" : "rejected";

        // Award points immediately for quiz tasks if correct
        if (isCorrect) {
          const pointLedger = new PointLedgerService();
          await pointLedger.addPoints({
            memberId,
            points: pointsEarned,
            transactionType: "earn",
            source: "micro-task",
            referenceType: "micro-task",
            referenceId: req.params.id,
            metadata: { isCorrect, ipAddress, userAgent }
          });
        }
      } 
      // Handle image-based tasks
      else if (completionRequirement === "image") {
        if (!req.file) {
          return res.status(400).json({ success: false, error: "Proof image is required for this task" });
        }

        // Upload image to object storage
        const objectStorageService = ObjectStorageService.getInstance();
        const privateObjectDir = objectStorageService.getPrivateObjectDir();
        const objectId = crypto.randomUUID();
        const fullPath = `${privateObjectDir}/task-proofs/${objectId}`;
        
        // Parse object path to get bucket and object name
        const pathParts = fullPath.split("/");
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join("/");
        
        // Upload file to object storage
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        
        await file.save(req.file.buffer, {
          metadata: {
            contentType: req.file.mimetype,
            metadata: {
              uploadedBy: memberId,
              taskId: req.params.id,
              originalName: req.file.originalname
            }
          }
        });

        proofUrl = `/objects/task-proofs/${objectId}`;
        status = "pending"; // Awaits admin approval
        pointsEarned = 0; // Points awarded only after approval
      }

      // Record completion
      const [completion] = await db.insert(schema.taskCompletions).values({
        taskId: req.params.id,
        taskType: "micro",
        memberId,
        proofUrl,
        pointsEarned,
        verified: completionRequirement === "quiz" ? true : false,
        status,
        ipAddress,
        userAgent,
        fingerprint
      }).returning();

      await db.update(schema.microTasks)
        .set({ currentCompletions: sql`COALESCE(${schema.microTasks.currentCompletions}, 0) + 1` })
        .where(eq(schema.microTasks.id, req.params.id));

      // Log audit trail
      await logAudit({
        memberId,
        action: AuditActions.ADMIN_ACTION,
        resourceType: "task",
        resourceId: req.params.id,
        details: { taskType: "micro", completionRequirement, isCorrect, pointsEarned, status },
        ipAddress,
        userAgent,
        fingerprint,
        status: "success",
      });

      res.json({ 
        success: true, 
        data: { 
          completion, 
          isCorrect: completionRequirement === "quiz" ? isCorrect : undefined, 
          pointsEarned,
          correctAnswers: (completionRequirement === "quiz" && !isCorrect) ? task.correctAnswers : undefined,
          message: completionRequirement === "image" ? "Submission received. Awaiting admin approval." : undefined
        } 
      });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === '23505') {
        return res.status(400).json({ 
          success: false, 
          error: "Task already completed" 
        });
      }
      console.error("Complete micro-task error:", error);
      res.status(500).json({ success: false, error: "Failed to complete micro-task" });
    }
  });

  // Admin: Get pending task completions
  app.get("/api/admin/task-completions/pending", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const completions = await db.query.taskCompletions.findMany({
        where: eq(schema.taskCompletions.status, "pending"),
        with: {
          member: true,
          task: true
        },
        orderBy: desc(schema.taskCompletions.completedAt)
      });

      res.json({ success: true, data: completions });
    } catch (error) {
      console.error("Fetch pending completions error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch pending completions" });
    }
  });

  // Admin: Approve task completion
  app.post("/api/admin/task-completions/:id/approve", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const completion = await db.query.taskCompletions.findFirst({
        where: eq(schema.taskCompletions.id, req.params.id),
        with: {
          task: true,
          member: true
        }
      });

      if (!completion) {
        return res.status(404).json({ success: false, error: "Task completion not found" });
      }

      if (completion.status !== "pending") {
        return res.status(400).json({ success: false, error: "Task completion is not pending" });
      }

      // Update completion status
      const pointsToAward = completion.task.points;
      await db.update(schema.taskCompletions)
        .set({
          status: "approved",
          approvedBy: req.user!.id,
          approvedAt: new Date(),
          pointsEarned: pointsToAward,
          verified: true
        })
        .where(eq(schema.taskCompletions.id, req.params.id));

      // Award points
      const pointLedger = new PointLedgerService();
      await pointLedger.addPoints({
        memberId: completion.memberId,
        points: pointsToAward,
        transactionType: "earn",
        source: "micro-task",
        referenceType: "micro-task",
        referenceId: completion.taskId,
        metadata: { 
          completionId: completion.id, 
          approvedBy: req.user!.id,
          approvalType: "manual"
        }
      });

      // Set ACL policy for proof image (make it accessible)
      if (completion.proofUrl) {
        try {
          const objectStorageService = ObjectStorageService.getInstance();
          await objectStorageService.setObjectKeyAclPolicy(completion.proofUrl, {
            visibility: "private",
            owner: completion.memberId
          });
        } catch (error) {
          console.error("Failed to set ACL policy:", error);
        }
      }

      // Log audit
      await logAudit({
        memberId: req.user!.id,
        action: AuditActions.ADMIN_ACTION,
        resourceType: "task-completion",
        resourceId: req.params.id,
        details: { 
          action: "approve", 
          taskId: completion.taskId,
          pointsAwarded: pointsToAward,
          completedBy: completion.memberId
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status: "success"
      });

      res.json({ success: true, data: { message: "Task completion approved", pointsAwarded: pointsToAward } });
    } catch (error) {
      console.error("Approve task completion error:", error);
      res.status(500).json({ success: false, error: "Failed to approve task completion" });
    }
  });

  // Admin: Reject task completion
  app.post("/api/admin/task-completions/:id/reject", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      
      const completion = await db.query.taskCompletions.findFirst({
        where: eq(schema.taskCompletions.id, req.params.id)
      });

      if (!completion) {
        return res.status(404).json({ success: false, error: "Task completion not found" });
      }

      if (completion.status !== "pending") {
        return res.status(400).json({ success: false, error: "Task completion is not pending" });
      }

      // Update completion status
      await db.update(schema.taskCompletions)
        .set({
          status: "rejected",
          approvedBy: req.user!.id,
          approvedAt: new Date(),
          rejectionReason: reason || "Did not meet requirements"
        })
        .where(eq(schema.taskCompletions.id, req.params.id));

      // Log audit
      await logAudit({
        memberId: req.user!.id,
        action: AuditActions.ADMIN_ACTION,
        resourceType: "task-completion",
        resourceId: req.params.id,
        details: { 
          action: "reject", 
          taskId: completion.taskId,
          reason,
          completedBy: completion.memberId
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status: "success"
      });

      res.json({ success: true, data: { message: "Task completion rejected" } });
    } catch (error) {
      console.error("Reject task completion error:", error);
      res.status(500).json({ success: false, error: "Failed to reject task completion" });
    }
  });

  // ========================================
  // ADMIN ACCOUNT MANAGEMENT ENDPOINTS
  // ========================================

  // Suspend member account
  app.post("/api/admin/members/:id/suspend", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      
      if (!reason || reason.trim() === "") {
        return res.status(400).json({ success: false, error: "Suspension reason is required" });
      }

      const result = await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "suspended",
        changedBy: req.user!.id,
        reason,
        metadata: { suspendedVia: "admin_panel" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });

      res.json({ 
        success: true, 
        data: result,
        message: "Member account suspended successfully"
      });
    } catch (error: any) {
      console.error("Suspend member error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to suspend member" });
    }
  });

  // Activate member account
  app.post("/api/admin/members/:id/activate", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      
      // Provide default reason if not supplied
      const activationReason = reason && reason.trim() !== "" 
        ? reason 
        : "Account activated by administrator";
      
      const result = await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "active",
        changedBy: req.user!.id,
        reason: activationReason,
        metadata: { activatedVia: "admin_panel" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });

      res.json({ 
        success: true, 
        data: result,
        message: "Member account activated successfully"
      });
    } catch (error: any) {
      console.error("Activate member error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to activate member" });
    }
  });

  // Soft delete member account
  app.post("/api/admin/members/:id/delete", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ success: false, error: "Deletion reason is required" });
      }

      const result = await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "deleted",
        changedBy: req.user!.id,
        reason,
        metadata: { deletedVia: "admin_panel" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });

      res.json({ 
        success: true, 
        data: result,
        message: "Member account deleted successfully"
      });
    } catch (error: any) {
      console.error("Delete member error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to delete member" });
    }
  });

  // Restore deleted member account
  app.post("/api/admin/members/:id/restore", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      
      // Provide default reason if not supplied
      const restoreReason = reason && reason.trim() !== "" 
        ? reason 
        : "Account restored by administrator";
      
      const result = await memberAccountService.applyMemberStatusChange({
        memberId: req.params.id,
        newStatus: "active",
        changedBy: req.user!.id,
        reason: restoreReason,
        metadata: { restoredVia: "admin_panel" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });

      res.json({ 
        success: true, 
        data: result,
        message: "Member account restored successfully"
      });
    } catch (error: any) {
      console.error("Restore member error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to restore member" });
    }
  });

  // Get member status history
  app.get("/api/admin/members/:id/status-history", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const history = await db.query.memberStatusHistory.findMany({
        where: eq(schema.memberStatusHistory.memberId, req.params.id),
        with: {
          actor: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: desc(schema.memberStatusHistory.createdAt)
      });

      res.json({ success: true, data: history });
    } catch (error) {
      console.error("Fetch status history error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch status history" });
    }
  });

  // Get member notes
  app.get("/api/admin/members/:id/notes", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const notes = await db.query.memberNotes.findMany({
        where: eq(schema.memberNotes.memberId, req.params.id),
        with: {
          author: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: desc(schema.memberNotes.createdAt)
      });

      res.json({ success: true, data: notes });
    } catch (error) {
      console.error("Fetch member notes error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch member notes" });
    }
  });

  // Create member note
  app.post("/api/admin/members/:id/notes", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { content, visibility } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, error: "Note content is required" });
      }

      const note = await memberAccountService.createMemberNote({
        memberId: req.params.id,
        authorId: req.user!.id,
        content,
        visibility: visibility || "admin_only"
      });

      res.json({ 
        success: true, 
        data: note,
        message: "Note created successfully"
      });
    } catch (error: any) {
      console.error("Create note error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to create note" });
    }
  });

  // Update member note
  app.patch("/api/admin/members/:memberId/notes/:noteId", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { content, visibility } = req.body;

      const note = await memberAccountService.updateMemberNote(
        req.params.noteId,
        req.user!.id,
        { content, visibility }
      );

      res.json({ 
        success: true, 
        data: note,
        message: "Note updated successfully"
      });
    } catch (error: any) {
      console.error("Update note error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to update note" });
    }
  });

  // Delete member note
  app.delete("/api/admin/members/:memberId/notes/:noteId", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      await memberAccountService.deleteMemberNote(req.params.noteId, req.user!.id);

      res.json({ 
        success: true,
        message: "Note deleted successfully"
      });
    } catch (error: any) {
      console.error("Delete note error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to delete note" });
    }
  });

  // Admin password reset
  app.post("/api/admin/members/:id/reset-password", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      // Get member to find their userId
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const result = await memberAccountService.initiateAdminPasswordReset(
        member.userId,
        req.user!.id,
        "email"
      );

      res.json(result);
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to reset password" });
    }
  });

  app.delete("/api/tasks/micro/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.microTasks).where(eq(schema.microTasks.id, req.params.id));
      res.json({ success: true, data: { message: "Micro-task deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete micro-task" });
    }
  });

  // VOLUNTEER TASKS ROUTES
  app.get("/api/tasks/volunteer", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { status, location, category, taskCategory: queryTaskCategory } = req.query;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: {
          ward: {
            with: {
              lga: {
                with: {
                  state: true
                }
              }
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const memberWardId = member.wardId;
      const memberLgaId = member.ward?.lgaId;
      const memberStateId = member.ward?.lga?.stateId;

      const now = new Date();

      const tasks = await db.query.volunteerTasks.findMany({
        where: and(
          eq(schema.volunteerTasks.isActive, true),
          drizzleOr(
            drizzleIsNull(schema.volunteerTasks.expiresAt),
            gte(schema.volunteerTasks.expiresAt, now)
          ),
          drizzleOr(
            eq(schema.volunteerTasks.taskScope, "national"),
            and(
              drizzleIsNull(schema.volunteerTasks.stateId),
              drizzleIsNull(schema.volunteerTasks.lgaId),
              drizzleIsNull(schema.volunteerTasks.wardId)
            ),
            ...(memberStateId ? [and(eq(schema.volunteerTasks.taskScope, "state"), eq(schema.volunteerTasks.stateId, memberStateId))] : []),
            ...(memberLgaId ? [and(eq(schema.volunteerTasks.taskScope, "lga"), eq(schema.volunteerTasks.lgaId, memberLgaId))] : []),
            ...(memberWardId ? [and(eq(schema.volunteerTasks.taskScope, "ward"), eq(schema.volunteerTasks.wardId, memberWardId))] : [])
          ),
          ...(queryTaskCategory && typeof queryTaskCategory === "string" ? [eq(schema.volunteerTasks.taskCategory, queryTaskCategory as any)] : [])
        ),
        with: {
          state: true,
          lga: true,
          ward: true,
        },
        orderBy: desc(schema.volunteerTasks.createdAt)
      });

      let filteredTasks = tasks;
      if (status) {
        filteredTasks = filteredTasks.filter(t => t.status === status);
      }
      if (location) {
        filteredTasks = filteredTasks.filter(t => t.location.toLowerCase().includes((location as string).toLowerCase()));
      }
      if (category) {
        filteredTasks = filteredTasks.filter(t => t.category === category);
      }

      res.json({ success: true, data: filteredTasks });
    } catch (error) {
      console.error("Fetch volunteer tasks error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch volunteer tasks" });
    }
  });

  app.get("/api/tasks/volunteer/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id),
        with: {
          applications: {
            with: {
              member: {
                with: { user: true }
              }
            }
          }
        }
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Volunteer task not found" });
      }

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch volunteer task" });
    }
  });

  app.post("/api/tasks/volunteer", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const taskData = schema.insertVolunteerTaskSchema.parse({
        ...req.body,
        creatorId: req.user!.id,
        currentVolunteers: 0
      });
      const [task] = await db.insert(schema.volunteerTasks).values([taskData as any]).returning();
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Create volunteer task error:", error);
      res.status(500).json({ success: false, error: "Failed to create volunteer task" });
    }
  });

  app.post("/api/tasks/volunteer/:id/assign", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      if (task.maxVolunteers && (task.currentVolunteers || 0) >= task.maxVolunteers) {
        return res.status(400).json({ success: false, error: "Task is full" });
      }

      const existingApplication = await db.query.taskApplications.findFirst({
        where: and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id)
        )
      });

      if (existingApplication) {
        return res.status(400).json({ success: false, error: "Already signed up for this task" });
      }

      const [application] = await db.insert(schema.taskApplications).values({
        taskId: req.params.id,
        memberId: member.id,
        status: "accepted"
      }).returning();

      await db.update(schema.volunteerTasks)
        .set({ currentVolunteers: (task.currentVolunteers || 0) + 1 })
        .where(eq(schema.volunteerTasks.id, req.params.id));

      res.json({ success: true, data: application });
    } catch (error) {
      console.error("Assign volunteer task error:", error);
      res.status(500).json({ success: false, error: "Failed to sign up for task" });
    }
  });

  app.post("/api/tasks/volunteer/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { proofUrl } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      const application = await db.query.taskApplications.findFirst({
        where: and(
          eq(schema.taskApplications.taskId, req.params.id),
          eq(schema.taskApplications.memberId, member.id),
          eq(schema.taskApplications.status, "accepted")
        )
      });

      if (!application) {
        return res.status(400).json({ success: false, error: "Not assigned to this task" });
      }

      const existingCompletion = await db.query.taskCompletions.findFirst({
        where: and(
          eq(schema.taskCompletions.taskId, req.params.id),
          eq(schema.taskCompletions.memberId, member.id),
          eq(schema.taskCompletions.taskType, "volunteer")
        )
      });

      if (existingCompletion) {
        return res.status(400).json({ success: false, error: "Task already completed" });
      }

      const [completion] = await db.insert(schema.taskCompletions).values({
        taskId: req.params.id,
        taskType: "volunteer",
        memberId: member.id,
        proofUrl,
        pointsEarned: 0,
        verified: false,
        status: "pending",
        ipAddress: req.antiCheat?.ipAddress,
        userAgent: req.antiCheat?.userAgent,
        fingerprint: req.antiCheat?.fingerprint
      }).returning();

      await db.update(schema.taskApplications)
        .set({ status: "completed" })
        .where(eq(schema.taskApplications.id, application.id));

      res.json({ success: true, data: completion });
    } catch (error) {
      console.error("Complete volunteer task error:", error);
      res.status(500).json({ success: false, error: "Failed to mark task complete" });
    }
  });

  app.post("/api/tasks/volunteer/:id/verify", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { completionId, approved } = req.body;

      const completion = await db.query.taskCompletions.findFirst({
        where: eq(schema.taskCompletions.id, completionId)
      });

      if (!completion) {
        return res.status(404).json({ success: false, error: "Completion not found" });
      }

      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, completion.taskId)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      const pointsEarned = approved ? task.points : 0;

      await db.update(schema.taskCompletions)
        .set({ 
          status: approved ? "approved" : "rejected",
          verified: true,
          pointsEarned
        })
        .where(eq(schema.taskCompletions.id, completionId));

      if (approved) {
        const pointLedger = new PointLedgerService();
        await pointLedger.addPoints({
          memberId: completion.memberId,
          points: pointsEarned,
          transactionType: "earn",
          source: "volunteer-task",
          referenceType: "volunteer-task",
          referenceId: task.id,
          metadata: { completionId, taskTitle: task.title, verified: true }
        });
      }

      res.json({ success: true, data: { message: "Task completion verified", pointsEarned } });
    } catch (error) {
      console.error("Verify volunteer task error:", error);
      res.status(500).json({ success: false, error: "Failed to verify task completion" });
    }
  });

  app.delete("/api/tasks/volunteer/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      await db.delete(schema.volunteerTasks).where(eq(schema.volunteerTasks.id, req.params.id));
      res.json({ success: true, data: { message: "Volunteer task deleted successfully" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete volunteer task" });
    }
  });

  // TASK COMPLETIONS & LEADERBOARD ROUTES
  app.get("/api/tasks/my-completions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const completions = await db.query.taskCompletions.findMany({
        where: eq(schema.taskCompletions.memberId, member.id),
        orderBy: desc(schema.taskCompletions.completedAt)
      });

      const microTaskIds = completions.filter(c => c.taskType === "micro").map(c => c.taskId);
      const volunteerTaskIds = completions.filter(c => c.taskType === "volunteer").map(c => c.taskId);

      const microTasks = microTaskIds.length > 0 
        ? await db.query.microTasks.findMany({
            where: sql`${schema.microTasks.id} = ANY(${microTaskIds})`
          })
        : [];

      const volunteerTasks = volunteerTaskIds.length > 0
        ? await db.query.volunteerTasks.findMany({
            where: sql`${schema.volunteerTasks.id} = ANY(${volunteerTaskIds})`
          })
        : [];

      const microTaskMap = new Map(microTasks.map(t => [t.id, t]));
      const volunteerTaskMap = new Map(volunteerTasks.map(t => [t.id, t]));

      const completionsWithTasks = completions.map(c => ({
        ...c,
        task: c.taskType === "micro" ? microTaskMap.get(c.taskId) : volunteerTaskMap.get(c.taskId)
      }));

      const totalPoints = completions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);

      res.json({ 
        success: true, 
        data: { 
          completions: completionsWithTasks,
          totalPoints,
          totalCompleted: completions.filter(c => c.status === "approved").length
        } 
      });
    } catch (error) {
      console.error("Fetch my completions error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch completions" });
    }
  });

  app.get("/api/tasks/leaderboard", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { period = "all", type } = req.query;

      let dateFilter = sql`TRUE`;
      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = gte(schema.taskCompletions.completedAt, weekAgo);
      } else if (period === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = gte(schema.taskCompletions.completedAt, monthAgo);
      }

      let typeFilter = sql`TRUE`;
      if (type) {
        typeFilter = eq(schema.taskCompletions.taskType, type as string);
      }

      const leaderboard = await db
        .select({
          memberId: schema.taskCompletions.memberId,
          totalPoints: sql<number>`SUM(${schema.taskCompletions.pointsEarned})`,
          totalTasks: sql<number>`COUNT(*)`,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.taskCompletions)
        .innerJoin(schema.members, eq(schema.taskCompletions.memberId, schema.members.id))
        .innerJoin(schema.users, eq(schema.members.userId, schema.users.id))
        .where(and(
          eq(schema.taskCompletions.status, "approved"),
          dateFilter,
          typeFilter
        ))
        .groupBy(schema.taskCompletions.memberId, schema.users.firstName, schema.users.lastName)
        .orderBy(desc(sql`SUM(${schema.taskCompletions.pointsEarned})`))
        .limit(20);

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      console.error("Fetch leaderboard error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
  });

  // Advanced Search API
  app.get("/api/search", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { q, category, limit = "20" } = req.query;
      
      if (!q || typeof q !== "string" || q.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: "Search query must be at least 2 characters" 
        });
      }

      const searchTerm = `%${q.trim()}%`;
      const searchLimit = Math.min(parseInt(limit as string) || 20, 50);
      
      const results: any = {
        news: [],
        events: [],
        campaigns: [],
        knowledgeBase: [],
        ideas: [],
        total: 0
      };

      // Search News if category matches or is not specified
      if (!category || category === "news") {
        const newsResults = await db.query.newsPosts.findMany({
          where: sql`${schema.newsPosts.title} ILIKE ${searchTerm} OR ${schema.newsPosts.excerpt} ILIKE ${searchTerm}`,
          limit: searchLimit,
          orderBy: [desc(schema.newsPosts.publishedAt)],
          with: {
            author: true
          }
        });
        results.news = newsResults;
      }

      // Search Events
      if (!category || category === "events") {
        const eventsResults = await db.query.events.findMany({
          where: sql`${schema.events.title} ILIKE ${searchTerm} OR ${schema.events.description} ILIKE ${searchTerm}`,
          limit: searchLimit,
          orderBy: [desc(schema.events.date)]
        });
        results.events = eventsResults;
      }

      // Search Campaigns
      if (!category || category === "campaigns") {
        const campaignsResults = await db.query.issueCampaigns.findMany({
          where: sql`${schema.issueCampaigns.title} ILIKE ${searchTerm} OR ${schema.issueCampaigns.description} ILIKE ${searchTerm}`,
          limit: searchLimit,
          orderBy: [desc(schema.issueCampaigns.createdAt)]
        });
        results.campaigns = campaignsResults;
      }

      // Search Knowledge Base
      if (!category || category === "knowledge") {
        const kbResults = await db.query.knowledgeArticles.findMany({
          where: sql`${schema.knowledgeArticles.title} ILIKE ${searchTerm} OR ${schema.knowledgeArticles.content} ILIKE ${searchTerm}`,
          limit: searchLimit,
          orderBy: [desc(schema.knowledgeArticles.createdAt)]
        });
        results.knowledgeBase = kbResults;
      }

      // Search Ideas
      if (!category || category === "ideas") {
        const ideasResults = await db.query.ideas.findMany({
          where: sql`${schema.ideas.title} ILIKE ${searchTerm} OR ${schema.ideas.description} ILIKE ${searchTerm}`,
          limit: searchLimit,
          orderBy: [desc(schema.ideas.createdAt)],
          with: {
            member: true
          }
        });
        results.ideas = ideasResults;
      }

      // Calculate total results
      results.total = 
        results.news.length + 
        results.events.length + 
        results.campaigns.length + 
        results.knowledgeBase.length +
        results.ideas.length;

      res.json({ 
        success: true, 
        data: {
          query: q,
          category: category || "all",
          results
        }
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ success: false, error: "Search failed" });
    }
  });

  // CSV Helper Function
  const convertToCSV = (data: any[], headers: string[]): string => {
    if (data.length === 0) {
      return headers.join(',') + '\n';
    }

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => escapeCSV(row[header]));
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  // Export Members Data
  app.get("/api/admin/export/members", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const members = await db.query.members.findMany({
        with: {
          user: true,
          ward: {
            with: {
              lga: {
                with: { state: true }
              }
            }
          }
        },
        orderBy: asc(schema.members.joinDate)
      });

      const csvData = members.map(member => {
        const user = Array.isArray(member.user) ? member.user[0] : member.user;
        const ward = Array.isArray(member.ward) ? member.ward[0] : member.ward;
        const lga = ward && !Array.isArray(ward.lga) ? ward.lga : null;
        const state = lga && !Array.isArray(lga.state) ? lga.state : null;

        return {
          id: member.id,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          wardId: member.wardId,
          lgaId: lga?.id || '',
          stateId: state?.id || '',
          membershipNumber: member.memberId,
          ninVerified: member.nin ? 'Yes' : 'No',
          createdAt: member.joinDate ? new Date(member.joinDate).toISOString() : ''
        };
      });

      const headers = ['id', 'firstName', 'lastName', 'email', 'phone', 'wardId', 'lgaId', 'stateId', 'membershipNumber', 'ninVerified', 'createdAt'];
      const csv = convertToCSV(csvData, headers);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `members_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Members export error:", error);
      res.status(500).json({ success: false, error: "Failed to export members data" });
    }
  });

  // Export Votes Data
  app.get("/api/admin/export/votes", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const votes = await db.query.votes.findMany({
        orderBy: desc(schema.votes.castedAt)
      });

      const csvData = votes.map(vote => ({
        electionId: vote.electionId,
        candidateId: vote.candidateId,
        voterId: vote.voterId,
        timestamp: vote.castedAt ? new Date(vote.castedAt).toISOString() : '',
        blockchainHash: vote.blockchainHash || ''
      }));

      const headers = ['electionId', 'candidateId', 'voterId', 'timestamp', 'blockchainHash'];
      const csv = convertToCSV(csvData, headers);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `votes_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Votes export error:", error);
      res.status(500).json({ success: false, error: "Failed to export votes data" });
    }
  });

  // Export Donations Data
  app.get("/api/admin/export/donations", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const donations = await db.query.donations.findMany({
        orderBy: desc(schema.donations.createdAt)
      });

      const csvData = donations.map(donation => ({
        id: donation.id,
        memberId: donation.memberId,
        amount: donation.amount,
        currency: donation.currency || 'NGN',
        status: donation.paymentStatus || '',
        paymentRef: donation.paystackReference || '',
        createdAt: donation.createdAt ? new Date(donation.createdAt).toISOString() : ''
      }));

      const headers = ['id', 'memberId', 'amount', 'currency', 'status', 'paymentRef', 'createdAt'];
      const csv = convertToCSV(csvData, headers);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `donations_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error("Donations export error:", error);
      res.status(500).json({ success: false, error: "Failed to export donations data" });
    }
  });

  // TEST ENDPOINT: Email service verification
  // This endpoint tests all three email templates
  // Remove or comment out in production
  app.get("/api/test/email-service", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      console.log("\n========== TESTING EMAIL SERVICE ==========\n");
      
      // Test welcome email
      await emailService.sendWelcomeEmail({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        memberId: "APC-2025-NG-12345",
        referralCode: "APCJOH1A2B3"
      });
      
      // Test event reminder email
      await emailService.sendEventReminderEmail("john.doe@example.com", {
        firstName: "John",
        eventTitle: "APC Youth Rally 2025",
        eventDate: "Saturday, January 25, 2025",
        eventTime: "10:00 AM",
        eventLocation: "Eagle Square, Abuja",
        eventDescription: "Join us for the biggest youth rally of the year! Meet party leaders, network with fellow members, and learn about our vision for Nigeria's future."
      });
      
      // Test election notification email
      await emailService.sendElectionNotificationEmail("john.doe@example.com", {
        firstName: "John",
        electionTitle: "Ward Chairman Election 2025",
        electionDate: "Monday, February 10, 2025",
        votingStartTime: "08:00 AM",
        votingEndTime: "05:00 PM",
        electionDescription: "Vote for your ward chairman to represent your interests at the local government level. Your voice matters in shaping the leadership of our party."
      });
      
      console.log("\n========== EMAIL SERVICE TEST COMPLETE ==========\n");
      
      res.json({ 
        success: true, 
        message: "Email service test completed. Check server logs for email previews."
      });
    } catch (error) {
      console.error("Email service test error:", error);
      res.status(500).json({ success: false, error: "Email service test failed" });
    }
  });

  // ============================================================================
  // PUSH NOTIFICATION ENDPOINTS
  // ============================================================================

  app.post("/api/push/subscribe", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { endpoint, p256dh, auth } = req.body;
      
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ success: false, error: "Missing subscription data" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existingSubscription = await db.query.pushSubscriptions.findFirst({
        where: and(
          eq(schema.pushSubscriptions.memberId, member.id),
          eq(schema.pushSubscriptions.endpoint, endpoint)
        )
      });

      if (!existingSubscription) {
        await db.insert(schema.pushSubscriptions).values({
          memberId: member.id,
          endpoint,
          p256dh,
          auth,
        });

        await logAudit({
          userId: req.user!.id,
          memberId: member.id,
          action: AuditActions.PUSH_SUBSCRIPTION,
          details: { action: "subscribe" },
          status: "success",
        });
      }

      res.json({ success: true, message: "Subscription saved" });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({ success: false, error: "Failed to save subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ success: false, error: "Missing endpoint" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.delete(schema.pushSubscriptions).where(
        and(
          eq(schema.pushSubscriptions.memberId, member.id),
          eq(schema.pushSubscriptions.endpoint, endpoint)
        )
      );

      await logAudit({
        userId: req.user!.id,
        memberId: member.id,
        action: AuditActions.PUSH_SUBSCRIPTION,
        details: { action: "unsubscribe" },
        status: "success",
      });

      res.json({ success: true, message: "Subscription removed" });
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ success: false, error: "Failed to remove subscription" });
    }
  });

  app.get("/api/push/preferences", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const preferences = await db.query.notificationPreferences.findFirst({
        where: eq(schema.notificationPreferences.memberId, member.id)
      });

      if (!preferences) {
        const defaultPreferences = {
          memberId: member.id,
          elections: true,
          events: true,
          news: true,
          tasks: true,
          badges: true,
          messages: true,
        };
        
        await db.insert(schema.notificationPreferences).values(defaultPreferences);
        return res.json({ success: true, preferences: defaultPreferences });
      }

      res.json({ success: true, preferences });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ success: false, error: "Failed to get preferences" });
    }
  });

  app.patch("/api/push/preferences", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const preferences = await db.query.notificationPreferences.findFirst({
        where: eq(schema.notificationPreferences.memberId, member.id)
      });

      const updateData = {
        electionAnnouncements: req.body.electionAnnouncements ?? preferences?.electionAnnouncements ?? true,
        eventReminders: req.body.eventReminders ?? preferences?.eventReminders ?? true,
        newsAlerts: req.body.newsAlerts ?? preferences?.newsAlerts ?? true,
        taskAssignments: req.body.taskAssignments ?? preferences?.taskAssignments ?? true,
        achievementNotifications: req.body.achievementNotifications ?? preferences?.achievementNotifications ?? true,
        systemAnnouncements: req.body.systemAnnouncements ?? preferences?.systemAnnouncements ?? true,
        duesReminders: req.body.duesReminders ?? preferences?.duesReminders ?? true,
        campaignUpdates: req.body.campaignUpdates ?? preferences?.campaignUpdates ?? true,
        referralRewards: req.body.referralRewards ?? preferences?.referralRewards ?? true,
      };

      if (preferences) {
        await db.update(schema.notificationPreferences)
          .set(updateData)
          .where(eq(schema.notificationPreferences.id, preferences.id));
      } else {
        await db.insert(schema.notificationPreferences).values({
          memberId: member.id,
          ...updateData,
        });
      }

      res.json({ success: true, preferences: updateData });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ success: false, error: "Failed to update preferences" });
    }
  });

  app.post("/api/push/subscribe/mobile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { token, platform, deviceName } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ success: false, error: "Missing token or platform" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.mobilePushTokens.findFirst({
        where: eq(schema.mobilePushTokens.token, token)
      });

      if (existing) {
        await db.update(schema.mobilePushTokens)
          .set({ memberId: member.id, platform, deviceName, isActive: true, updatedAt: new Date() })
          .where(eq(schema.mobilePushTokens.id, existing.id));
      } else {
        await db.insert(schema.mobilePushTokens).values({
          memberId: member.id,
          token,
          platform,
          deviceName,
        });
      }

      res.json({ success: true, data: { message: "Mobile push token registered" } });
    } catch (error) {
      console.error("Error registering mobile push token:", error);
      res.status(500).json({ success: false, error: "Failed to register push token" });
    }
  });

  app.delete("/api/push/unsubscribe/mobile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      await db.update(schema.mobilePushTokens)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.mobilePushTokens.memberId, member.id));

      res.json({ success: true, data: { message: "Mobile push tokens deactivated" } });
    } catch (error) {
      console.error("Error unregistering mobile push token:", error);
      res.status(500).json({ success: false, error: "Failed to unregister push token" });
    }
  });

  app.get("/api/push/vapid-key", (req: Request, res: Response) => {
    const publicKey = pushService.getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({ success: false, error: "Push notifications not configured" });
    }
    res.json({ success: true, publicKey });
  });

  // ============================================================================
  // ADMIN API ENDPOINTS
  // ============================================================================

  // Helper function to generate CSV from data
  const generateCSV = (data: any[], fields: string[]): string => {
    const header = fields.join(',');
    const rows = data.map(row => {
      return fields.map(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], row);
        const stringValue = value === null || value === undefined ? '' : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      }).join(',');
    });
    return [header, ...rows].join('\n');
  };

  // Audit Logs Endpoints
  app.get("/api/admin/audit-logs", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listAuditLogs(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ success: false, error: "Failed to get audit logs" });
    }
  });

  app.get("/api/admin/audit-logs/export", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search as string || '';
      const action = req.query.action as string || '';
      const status = req.query.status as string || '';

      let whereConditions: any[] = [];

      if (search) {
        whereConditions.push(
          sql`(${schema.auditLogs.action} ILIKE ${`%${search}%`} OR 
               ${schema.auditLogs.resourceType} ILIKE ${`%${search}%`} OR
               ${schema.auditLogs.ipAddress} ILIKE ${`%${search}%`})`
        );
      }

      if (action) {
        whereConditions.push(eq(schema.auditLogs.action, action));
      }

      if (status) {
        whereConditions.push(eq(schema.auditLogs.status, status));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const logs = await db.query.auditLogs.findMany({
        where: whereClause,
        orderBy: desc(schema.auditLogs.createdAt),
        limit: 10000, // Limit to 10k records for export
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });

      const exportData = logs.map(log => {
        const user = log.user as (typeof schema.users.$inferSelect) | undefined;
        return {
          createdAt: log.createdAt?.toISOString() || '',
          action: log.action || '',
          user: user ? `${user.firstName} ${user.lastName}` : '',
          email: user?.email || '',
          resourceType: log.resourceType || '',
          resourceId: log.resourceId || '',
          status: log.status || '',
          ipAddress: log.ipAddress || '',
          fraudScore: log.fraudScore || 0,
          suspiciousActivity: log.suspiciousActivity ? 'Yes' : 'No',
        };
      });

      const csv = generateCSV(exportData, [
        'createdAt',
        'action',
        'user',
        'email',
        'resourceType',
        'resourceId',
        'status',
        'ipAddress',
        'fraudScore',
        'suspiciousActivity'
      ]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Export audit logs error:", error);
      res.status(500).json({ success: false, error: "Failed to export audit logs" });
    }
  });

  // Members Bulk Operations
  app.post("/api/admin/members/bulk", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { ids, action, reason } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid member IDs" });
      }

      // Validate action
      const validActions = ["suspend", "activate", "delete", "restore", "activate", "deactivate"];
      if (!validActions.includes(action)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid action. Allowed: ${validActions.join(", ")}` 
        });
      }

      // Map old action names to new status values
      const statusMap: Record<string, "active" | "inactive" | "suspended" | "deleted"> = {
        "activate": "active",
        "deactivate": "inactive",
        "suspend": "suspended",
        "delete": "deleted",
        "restore": "active"
      };

      const newStatus = statusMap[action];
      const results: { id: string; success: boolean; error?: string }[] = [];

      // Process each member individually using service layer
      for (const memberId of ids) {
        try {
          await memberAccountService.applyMemberStatusChange({
            memberId,
            newStatus,
            changedBy: req.user!.id,
            reason: reason || `Bulk ${action} operation`,
            metadata: { bulkOperation: true, totalCount: ids.length },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
          });
          results.push({ id: memberId, success: true });
        } catch (error: any) {
          console.error(`Failed to ${action} member ${memberId}:`, error);
          results.push({ 
            id: memberId, 
            success: false, 
            error: error.message || "Unknown error"
          });
        }
      }

      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Audit log
      await logAudit({
        userId: req.user!.id,
        action: `bulk_${action}_members`,
        resourceType: 'member',
        details: { 
          memberIds: ids, 
          totalCount: ids.length,
          successCount,
          failureCount,
          reason
        },
        status: failureCount === 0 ? 'success' : 'failure',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ 
        success: true, 
        message: `Bulk ${action}: ${successCount} succeeded, ${failureCount} failed`,
        data: {
          total: ids.length,
          succeeded: successCount,
          failed: failureCount,
          results
        }
      });
    } catch (error) {
      console.error("Members bulk operation error:", error);
      res.status(500).json({ success: false, error: "Failed to complete bulk operation" });
    }
  });

  // Quiz Management Endpoints
  app.get("/api/admin/quizzes", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listQuizzes(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get quizzes error:", error);
      res.status(500).json({ success: false, error: "Failed to get quizzes" });
    }
  });

  app.post("/api/admin/quizzes", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { question, options, correctAnswer, category, difficulty, explanation, points } = req.body;

      if (!question || !options || correctAnswer === undefined || !category || !difficulty || !points) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ success: false, error: "Options must be an array with at least 2 items" });
      }

      if (correctAnswer < 0 || correctAnswer >= options.length) {
        return res.status(400).json({ success: false, error: "Invalid correct answer index" });
      }

      const [quiz] = await db.insert(schema.quizzes).values({
        question,
        options,
        correctAnswer,
        category,
        difficulty: difficulty as any,
        explanation: explanation || null,
        points,
      }).returning();

      await logAudit({
        userId: req.user!.id,
        action: 'create_quiz',
        resourceType: 'quiz',
        resourceId: quiz.id,
        details: { question, category, difficulty },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, data: quiz });
    } catch (error) {
      console.error("Create quiz error:", error);
      res.status(500).json({ success: false, error: "Failed to create quiz" });
    }
  });

  app.patch("/api/admin/quizzes/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { question, options, correctAnswer, category, difficulty, explanation, points } = req.body;

      const existingQuiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, id)
      });

      if (!existingQuiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      if (options && (!Array.isArray(options) || options.length < 2)) {
        return res.status(400).json({ success: false, error: "Options must be an array with at least 2 items" });
      }

      if (correctAnswer !== undefined && options) {
        if (correctAnswer < 0 || correctAnswer >= options.length) {
          return res.status(400).json({ success: false, error: "Invalid correct answer index" });
        }
      }

      const updateData: any = {};
      if (question !== undefined) updateData.question = question;
      if (options !== undefined) updateData.options = options;
      if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
      if (category !== undefined) updateData.category = category;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (explanation !== undefined) updateData.explanation = explanation;
      if (points !== undefined) updateData.points = points;

      const [quiz] = await db.update(schema.quizzes)
        .set(updateData)
        .where(eq(schema.quizzes.id, id))
        .returning();

      await logAudit({
        userId: req.user!.id,
        action: 'update_quiz',
        resourceType: 'quiz',
        resourceId: id,
        details: updateData,
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, data: quiz });
    } catch (error) {
      console.error("Update quiz error:", error);
      res.status(500).json({ success: false, error: "Failed to update quiz" });
    }
  });

  app.delete("/api/admin/quizzes/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existingQuiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, id)
      });

      if (!existingQuiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      await db.delete(schema.quizzes).where(eq(schema.quizzes.id, id));

      await logAudit({
        userId: req.user!.id,
        action: 'delete_quiz',
        resourceType: 'quiz',
        resourceId: id,
        details: { question: existingQuiz.question },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, message: "Quiz deleted successfully" });
    } catch (error) {
      console.error("Delete quiz error:", error);
      res.status(500).json({ success: false, error: "Failed to delete quiz" });
    }
  });

  app.get("/api/admin/quizzes/export", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const category = req.query.category as string || '';
      const difficulty = req.query.difficulty as string || '';

      let whereConditions: any[] = [];

      if (category) {
        whereConditions.push(eq(schema.quizzes.category, category));
      }

      if (difficulty) {
        whereConditions.push(eq(schema.quizzes.difficulty, difficulty as any));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const quizzes = await db.query.quizzes.findMany({
        where: whereClause,
        orderBy: desc(schema.quizzes.createdAt),
        limit: 10000,
      });

      const exportData = quizzes.map(quiz => ({
        question: quiz.question || '',
        category: quiz.category || '',
        difficulty: quiz.difficulty || '',
        points: quiz.points || 0,
        options: (quiz.options as string[]).join(' | '),
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation || '',
        createdAt: quiz.createdAt?.toISOString() || '',
      }));

      const csv = generateCSV(exportData, [
        'question',
        'category',
        'difficulty',
        'points',
        'options',
        'correctAnswer',
        'explanation',
        'createdAt'
      ]);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quizzes_${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Export quizzes error:", error);
      res.status(500).json({ success: false, error: "Failed to export quizzes" });
    }
  });

  // Elections Admin Routes
  app.get("/api/admin/elections", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listElections(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get elections error:", error);
      res.status(500).json({ success: false, error: "Failed to get elections" });
    }
  });

  // Events Admin Routes
  app.get("/api/admin/events", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listEvents(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ success: false, error: "Failed to get events" });
    }
  });

  // Content/News Admin Routes
  app.get("/api/admin/content", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listNews(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get news error:", error);
      res.status(500).json({ success: false, error: "Failed to get news" });
    }
  });

  // Campaigns Admin Routes
  app.get("/api/admin/campaigns", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listCampaigns(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ success: false, error: "Failed to get campaigns" });
    }
  });

  app.post("/api/admin/campaigns/bulk", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { ids, action } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid campaign IDs" });
      }

      await storage.bulkUpdateCampaigns(ids, action);

      await logAudit({
        userId: req.user!.id,
        action: `bulk_${action}_campaigns`,
        resourceType: 'campaign',
        details: { campaignIds: ids, count: ids.length },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, message: `Bulk action "${action}" completed on ${ids.length} campaign(s)` });
    } catch (error) {
      console.error("Campaigns bulk operation error:", error);
      res.status(500).json({ success: false, error: "Failed to complete bulk operation" });
    }
  });

  // Incidents Admin Routes
  app.get("/api/admin/incidents", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listIncidents(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get incidents error:", error);
      res.status(500).json({ success: false, error: "Failed to get incidents" });
    }
  });

  // Knowledge Base Admin Routes
  app.get("/api/admin/knowledge-base", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listKnowledgeArticles(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get knowledge articles error:", error);
      res.status(500).json({ success: false, error: "Failed to get knowledge articles" });
    }
  });

  // Tasks Admin Routes
  app.get("/api/admin/tasks", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listTasks(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ success: false, error: "Failed to get tasks" });
    }
  });

  // Donations Admin Routes (updated to use storage pattern)
  app.get("/api/admin/donations-list", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const result = await storage.listDonations(req.query as FilterDTO);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Get donations error:", error);
      res.status(500).json({ success: false, error: "Failed to get donations" });
    }
  });

  // Point Ledger & Purchase Routes
  app.use("/api/points", pointsRouter);

  // Gamification Routes
  app.use("/api/tasks/user-created", userTasksRouter);
  app.use("/api/social/shares", socialSharesRouter);
  app.use("/api/referrals", referralsRouter);
  app.use("/api/leaderboards", leaderboardsRouter);

  // ==========================================
  // GENERAL ELECTIONS & LIVE RESULTS
  // ==========================================

  app.get("/api/parties", async (_req: Request, res: Response) => {
    try {
      const allParties = await db.query.parties.findMany({
        orderBy: asc(schema.parties.name),
      });
      res.json({ success: true, data: allParties });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch parties" });
    }
  });

  app.post("/api/parties", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const partyData = schema.insertPartySchema.parse(req.body);
      const [party] = await db.insert(schema.parties).values(partyData).returning();
      res.json({ success: true, data: party });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Failed to create party" });
    }
  });

  app.get("/api/general-elections", async (req: Request, res: Response) => {
    try {
      const { status, position, year } = req.query;
      let conditions: any[] = [];
      if (status) conditions.push(eq(schema.generalElections.status, status as any));
      if (position) conditions.push(eq(schema.generalElections.position, position as any));
      if (year) conditions.push(eq(schema.generalElections.electionYear, parseInt(year as string)));

      const elections = await db.query.generalElections.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          state: true,
          candidates: {
            with: { party: true },
          },
        },
        orderBy: desc(schema.generalElections.electionDate),
      });
      res.json({ success: true, data: elections });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch general elections" });
    }
  });

  app.get("/api/general-elections/:id", async (req: Request, res: Response) => {
    try {
      const election = await db.query.generalElections.findFirst({
        where: eq(schema.generalElections.id, req.params.id),
        with: {
          state: true,
          candidates: {
            with: { party: true },
          },
        },
      });
      if (!election) return res.status(404).json({ success: false, error: "Election not found" });
      res.json({ success: true, data: election });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch election" });
    }
  });

  app.post("/api/general-elections", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const electionData = schema.insertGeneralElectionSchema.parse(req.body);
      const [election] = await db.insert(schema.generalElections).values(electionData).returning();
      res.json({ success: true, data: election });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Failed to create election" });
    }
  });

  app.patch("/api/general-elections/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [updated] = await db.update(schema.generalElections)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(schema.generalElections.id, req.params.id))
        .returning();
      io.emit("general-election:updated", updated);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/general-elections/:id/candidates", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const candidateData = schema.insertGeneralElectionCandidateSchema.parse({
        ...req.body,
        electionId: req.params.id,
      });
      const [candidate] = await db.insert(schema.generalElectionCandidates).values(candidateData).returning();
      res.json({ success: true, data: candidate });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Failed to add candidate" });
    }
  });

  app.post("/api/general-elections/:id/results", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const resultEntrySchema = z.object({
        candidateId: z.string().min(1),
        partyId: z.string().min(1),
        votes: z.number().int().min(0),
        registeredVoters: z.number().int().min(0).optional(),
        accreditedVoters: z.number().int().min(0).optional(),
      });
      const bodySchema = z.object({
        pollingUnitId: z.string().min(1),
        results: z.array(resultEntrySchema).min(1),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid results data", details: parsed.error.issues });
      }
      const { pollingUnitId, results } = parsed.data;

      const electionId = req.params.id;
      const memberId = (req as any).user?.member?.id;
      const insertedResults = [];

      for (const r of results) {
        const [result] = await db.insert(schema.pollingUnitResults).values({
          electionId,
          pollingUnitId,
          candidateId: r.candidateId,
          partyId: r.partyId,
          votes: r.votes,
          registeredVoters: r.registeredVoters || 0,
          accreditedVoters: r.accreditedVoters || 0,
          reportedBy: memberId,
        }).onConflictDoUpdate({
          target: [schema.pollingUnitResults.electionId, schema.pollingUnitResults.pollingUnitId, schema.pollingUnitResults.candidateId],
          set: {
            votes: r.votes,
            registeredVoters: r.registeredVoters || 0,
            accreditedVoters: r.accreditedVoters || 0,
            updatedAt: new Date(),
          },
        }).returning();
        insertedResults.push(result);
      }

      io.emit("general-election:result-updated", {
        electionId,
        pollingUnitId,
        results: insertedResults,
      });

      res.json({ success: true, data: insertedResults });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Failed to submit results" });
    }
  });

  app.get("/api/general-elections/:id/results/summary", async (req: Request, res: Response) => {
    try {
      const electionId = req.params.id;
      const { level, stateId, lgaId } = req.query;

      const candidateTotals = await db.execute(sql`
        SELECT 
          gec.id as candidate_id,
          gec.name as candidate_name,
          gec.running_mate,
          gec.image_url,
          p.id as party_id,
          p.name as party_name,
          p.abbreviation as party_abbreviation,
          p.color as party_color,
          COALESCE(SUM(pur.votes), 0)::int as total_votes
        FROM general_election_candidates gec
        JOIN parties p ON gec.party_id = p.id
        LEFT JOIN polling_unit_results pur ON pur.candidate_id = gec.id AND pur.election_id = gec.election_id
        ${stateId ? sql`LEFT JOIN polling_units pu ON pur.polling_unit_id = pu.id
        LEFT JOIN wards w ON pu.ward_id = w.id
        LEFT JOIN lgas l ON w.lga_id = l.id` : sql``}
        WHERE gec.election_id = ${electionId}
        ${stateId ? sql`AND l.state_id = ${stateId as string}` : sql``}
        ${lgaId ? sql`AND l.id = ${lgaId as string}` : sql``}
        GROUP BY gec.id, gec.name, gec.running_mate, gec.image_url, p.id, p.name, p.abbreviation, p.color
        ORDER BY total_votes DESC
      `);

      const totalPUsReported = await db.execute(sql`
        SELECT COUNT(DISTINCT polling_unit_id)::int as count
        FROM polling_unit_results
        WHERE election_id = ${electionId}
      `);

      const totalPUs = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM polling_units
      `);

      res.json({
        success: true,
        data: {
          candidates: candidateTotals.rows,
          totalPollingUnitsReported: totalPUsReported.rows[0]?.count || 0,
          totalPollingUnits: totalPUs.rows[0]?.count || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to fetch results" });
    }
  });

  app.get("/api/general-elections/:id/results/by-state", async (req: Request, res: Response) => {
    try {
      const electionId = req.params.id;

      const stateResults = await db.execute(sql`
        SELECT 
          s.id as state_id,
          s.name as state_name,
          p.abbreviation as party,
          p.color as party_color,
          COALESCE(SUM(pur.votes), 0)::int as votes,
          COUNT(DISTINCT pur.polling_unit_id)::int as pus_reported
        FROM polling_unit_results pur
        JOIN polling_units pu ON pur.polling_unit_id = pu.id
        JOIN wards w ON pu.ward_id = w.id
        JOIN lgas l ON w.lga_id = l.id
        JOIN states s ON l.state_id = s.id
        JOIN parties p ON pur.party_id = p.id
        WHERE pur.election_id = ${electionId}
        GROUP BY s.id, s.name, p.abbreviation, p.color
        ORDER BY s.name, votes DESC
      `);

      res.json({ success: true, data: stateResults.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to fetch state results" });
    }
  });

  app.get("/api/general-elections/:id/results/live-feed", async (req: Request, res: Response) => {
    try {
      const electionId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const recentResults = await db.execute(sql`
        SELECT 
          pur.reported_at,
          pu.name as polling_unit_name,
          w.name as ward_name,
          l.name as lga_name,
          s.name as state_name,
          p.abbreviation as party,
          p.color as party_color,
          gec.name as candidate_name,
          pur.votes
        FROM polling_unit_results pur
        JOIN polling_units pu ON pur.polling_unit_id = pu.id
        JOIN wards w ON pu.ward_id = w.id
        JOIN lgas l ON w.lga_id = l.id
        JOIN states s ON l.state_id = s.id
        JOIN parties p ON pur.party_id = p.id
        JOIN general_election_candidates gec ON pur.candidate_id = gec.id
        WHERE pur.election_id = ${electionId}
        ORDER BY pur.reported_at DESC
        LIMIT ${limit}
      `);

      res.json({ success: true, data: recentResults.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================
  // MEMBER SEARCH - Admin agent assignment
  // ============================================================

  app.get("/api/admin/members-search", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { q, limit: limitParam } = req.query;
      const searchLimit = Math.min(parseInt(limitParam as string) || 20, 50);

      if (!q || (q as string).trim().length < 2) {
        return res.json({ success: true, data: [] });
      }

      const searchTerm = `%${(q as string).trim()}%`;

      const results = await db.query.members.findMany({
        where: drizzleOr(
          ilike(schema.members.memberId, searchTerm),
          sql`EXISTS (SELECT 1 FROM users u WHERE u.id = ${schema.members.userId} AND (u.first_name ILIKE ${searchTerm} OR u.last_name ILIKE ${searchTerm} OR u.email ILIKE ${searchTerm}))`
        ),
        with: { user: true },
        limit: searchLimit,
      });

      const data = results.map(m => ({
        id: m.id,
        memberId: m.memberId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        status: m.status,
      }));

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to search members" });
    }
  });

  // ============================================================
  // POLLING AGENTS - Admin assignment & Agent operations
  // ============================================================

  app.post("/api/admin/polling-agents", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId, pollingUnitId, electionId, notes } = req.body;

      if (!memberId || !pollingUnitId) {
        return res.status(400).json({ success: false, error: "Member ID and Polling Unit ID are required" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, memberId),
        with: { user: true }
      });
      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const unit = await db.query.pollingUnits.findFirst({
        where: eq(schema.pollingUnits.id, pollingUnitId)
      });
      if (!unit) {
        return res.status(404).json({ success: false, error: "Polling unit not found" });
      }

      const agentCode = `AGT-${unit.unitCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const agentPin = Math.floor(1000 + Math.random() * 9000).toString();

      const [agent] = await db.insert(schema.pollingAgents).values({
        memberId,
        pollingUnitId,
        electionId: electionId || null,
        agentCode,
        agentPin,
        assignedBy: req.user!.id,
        notes: notes || null,
        status: "assigned",
      }).returning();

      res.json({ success: true, data: { ...agent, agentCode, agentPin } });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ success: false, error: "Agent already assigned to this polling unit for this election" });
      }
      res.status(500).json({ success: false, error: "Failed to assign polling agent" });
    }
  });

  app.get("/api/admin/polling-agents", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { electionId, status } = req.query;
      let agents;

      const conditions: any[] = [];
      if (electionId) conditions.push(eq(schema.pollingAgents.electionId, electionId as string));
      if (status) conditions.push(eq(schema.pollingAgents.status, status as any));

      agents = await db.query.pollingAgents.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          member: { with: { user: true } },
          pollingUnit: true,
          election: true,
        },
        orderBy: desc(schema.pollingAgents.assignedAt),
      });

      res.json({ success: true, data: agents });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch polling agents" });
    }
  });

  app.patch("/api/admin/polling-agents/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { status, notes } = req.body;
      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === "revoked") updateData.completedAt = new Date();

      const [agent] = await db.update(schema.pollingAgents)
        .set(updateData)
        .where(eq(schema.pollingAgents.id, req.params.id))
        .returning();

      res.json({ success: true, data: agent });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to update polling agent" });
    }
  });

  app.post("/api/agent/login", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin } = req.body;

      if (!agentCode || !agentPin) {
        return res.status(400).json({ success: false, error: "Agent code and PIN are required" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
        with: {
          member: { with: { user: true } },
          pollingUnit: true,
          election: true,
        }
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid agent code or PIN" });
      }

      if (agent.status === "revoked") {
        return res.status(403).json({ success: false, error: "Agent access has been revoked" });
      }

      if (agent.status === "assigned") {
        await db.update(schema.pollingAgents)
          .set({ status: "checked_in", checkedInAt: new Date() })
          .where(eq(schema.pollingAgents.id, agent.id));
      }

      const ward = await db.query.wards.findFirst({
        where: eq(schema.wards.id, agent.pollingUnit.wardId)
      });
      const lga = ward ? await db.query.lgas.findFirst({ where: eq(schema.lgas.id, ward.lgaId) }) : null;
      const state = lga ? await db.query.states.findFirst({ where: eq(schema.states.id, lga.stateId) }) : null;

      const allActiveElections = await db.query.generalElections.findMany({
        where: drizzleOr(
          eq(schema.generalElections.status, "ongoing"),
          eq(schema.generalElections.status, "upcoming")
        ),
        orderBy: asc(schema.generalElections.position),
      });

      const electionsWithCandidates = await Promise.all(
        allActiveElections.map(async (election) => {
          const candidates = await db.query.generalElectionCandidates.findMany({
            where: eq(schema.generalElectionCandidates.electionId, election.id),
            with: { party: true }
          });

          const existingResults = await db.query.pollingUnitResults.findMany({
            where: and(
              eq(schema.pollingUnitResults.electionId, election.id),
              eq(schema.pollingUnitResults.pollingUnitId, agent.pollingUnitId)
            ),
          });

          const resultSheets = await db.query.resultSheets.findMany({
            where: and(
              eq(schema.resultSheets.electionId, election.id),
              eq(schema.resultSheets.pollingUnitId, agent.pollingUnitId)
            ),
          });

          return {
            id: election.id,
            title: election.title,
            position: election.position,
            status: election.status,
            electionDate: election.electionDate,
            candidates: candidates.map(c => ({
              id: c.id,
              name: c.name,
              party: c.party.abbreviation,
              partyColor: c.party.color,
              partyId: c.partyId,
              partyName: c.party.name,
            })),
            submittedResults: existingResults.map(r => ({
              candidateId: r.candidateId,
              partyId: r.partyId,
              votes: r.votes,
              isVerified: r.isVerified,
            })),
            registeredVoters: existingResults[0]?.registeredVoters || 0,
            accreditedVoters: existingResults[0]?.accreditedVoters || 0,
            hasResults: existingResults.length > 0,
            resultSheets: resultSheets.map(rs => ({
              id: rs.id,
              fileUrl: rs.fileUrl,
              fileName: rs.fileName,
              isVerified: rs.isVerified,
              uploadedAt: rs.uploadedAt,
            })),
          };
        })
      );

      res.json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            agentCode: agent.agentCode,
            status: agent.status === "assigned" ? "checked_in" : agent.status,
            memberId: agent.memberId,
            memberName: `${agent.member.user.firstName} ${agent.member.user.lastName}`,
          },
          pollingUnit: {
            id: agent.pollingUnit.id,
            name: agent.pollingUnit.name,
            unitCode: agent.pollingUnit.unitCode,
            status: agent.pollingUnit.status,
          },
          location: {
            ward: ward?.name || "",
            lga: lga?.name || "",
            state: state?.name || "",
          },
          elections: electionsWithCandidates,
          election: agent.election ? {
            id: agent.election.id,
            title: agent.election.title,
            position: agent.election.position,
            status: agent.election.status,
          } : null,
          candidates: agent.electionId ? electionsWithCandidates
            .find(e => e.id === agent.electionId)?.candidates || [] : [],
        }
      });
    } catch (error) {
      console.error("Agent login error:", error);
      res.status(500).json({ success: false, error: "Failed to authenticate agent" });
    }
  });

  app.post("/api/agent/submit-results", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin, electionId, pollingUnitId, results, registeredVoters, accreditedVoters } = req.body;

      if (!agentCode || !agentPin || !electionId || !pollingUnitId || !results || !Array.isArray(results)) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
        with: { member: true }
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid agent credentials" });
      }

      if (agent.status === "revoked") {
        return res.status(403).json({ success: false, error: "Agent access has been revoked" });
      }

      if (agent.pollingUnitId !== pollingUnitId) {
        return res.status(403).json({ success: false, error: "You are not assigned to this polling unit" });
      }

      const deviceInfo = {
        userAgent: req.headers["user-agent"] || "",
        ip: req.ip || "",
        timestamp: new Date().toISOString(),
      };

      const submittedResults = [];
      for (const result of results) {
        const { candidateId, partyId, votes } = result;
        if (!candidateId || !partyId || votes === undefined) continue;

        const existing = await db.query.pollingUnitResults.findFirst({
          where: and(
            eq(schema.pollingUnitResults.electionId, electionId),
            eq(schema.pollingUnitResults.pollingUnitId, pollingUnitId),
            eq(schema.pollingUnitResults.candidateId, candidateId)
          )
        });

        if (existing) {
          const [updated] = await db.update(schema.pollingUnitResults)
            .set({
              votes: parseInt(votes),
              registeredVoters: registeredVoters ? parseInt(registeredVoters) : existing.registeredVoters,
              accreditedVoters: accreditedVoters ? parseInt(accreditedVoters) : existing.accreditedVoters,
              reportedBy: agent.memberId,
              updatedAt: new Date(),
              deviceInfo,
            })
            .where(eq(schema.pollingUnitResults.id, existing.id))
            .returning();
          submittedResults.push(updated);
        } else {
          const [inserted] = await db.insert(schema.pollingUnitResults).values({
            electionId,
            pollingUnitId,
            candidateId,
            partyId,
            votes: parseInt(votes),
            registeredVoters: registeredVoters ? parseInt(registeredVoters) : 0,
            accreditedVoters: accreditedVoters ? parseInt(accreditedVoters) : 0,
            reportedBy: agent.memberId,
            deviceInfo,
          }).returning();
          submittedResults.push(inserted);
        }
      }

      await db.update(schema.pollingAgents)
        .set({ status: "active" })
        .where(eq(schema.pollingAgents.id, agent.id));

      io.emit("general-election:result-updated", { electionId, pollingUnitId });

      res.json({
        success: true,
        data: {
          submitted: submittedResults.length,
          pollingUnitId,
          electionId,
          reportedBy: agent.memberId,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to submit results" });
    }
  });

  app.post("/api/agent/submit-results-batch", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin, pollingUnitId, submissions } = req.body;

      if (!agentCode || !agentPin || !pollingUnitId || !submissions || !Array.isArray(submissions)) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
        with: { member: true }
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid agent credentials" });
      }
      if (agent.status === "revoked") {
        return res.status(403).json({ success: false, error: "Agent access has been revoked" });
      }
      if (agent.pollingUnitId !== pollingUnitId) {
        return res.status(403).json({ success: false, error: "You are not assigned to this polling unit" });
      }

      const deviceInfo = {
        userAgent: req.headers["user-agent"] || "",
        ip: req.ip || "",
        timestamp: new Date().toISOString(),
      };

      const batchSummary: Array<{ electionId: string; submitted: number }> = [];

      for (const submission of submissions) {
        const { electionId, results, registeredVoters, accreditedVoters } = submission;
        if (!electionId || !results || !Array.isArray(results)) continue;

        let submittedCount = 0;
        for (const result of results) {
          const { candidateId, partyId, votes } = result;
          if (!candidateId || !partyId || votes === undefined) continue;

          const existing = await db.query.pollingUnitResults.findFirst({
            where: and(
              eq(schema.pollingUnitResults.electionId, electionId),
              eq(schema.pollingUnitResults.pollingUnitId, pollingUnitId),
              eq(schema.pollingUnitResults.candidateId, candidateId)
            )
          });

          if (existing) {
            await db.update(schema.pollingUnitResults)
              .set({
                votes: parseInt(votes),
                registeredVoters: registeredVoters ? parseInt(registeredVoters) : existing.registeredVoters,
                accreditedVoters: accreditedVoters ? parseInt(accreditedVoters) : existing.accreditedVoters,
                reportedBy: agent.memberId,
                updatedAt: new Date(),
                deviceInfo,
              })
              .where(eq(schema.pollingUnitResults.id, existing.id));
          } else {
            await db.insert(schema.pollingUnitResults).values({
              electionId,
              pollingUnitId,
              candidateId,
              partyId,
              votes: parseInt(votes),
              registeredVoters: registeredVoters ? parseInt(registeredVoters) : 0,
              accreditedVoters: accreditedVoters ? parseInt(accreditedVoters) : 0,
              reportedBy: agent.memberId,
              deviceInfo,
            });
          }
          submittedCount++;
        }

        if (submittedCount > 0) {
          batchSummary.push({ electionId, submitted: submittedCount });
          io.emit("general-election:result-updated", { electionId, pollingUnitId });
        }
      }

      await db.update(schema.pollingAgents)
        .set({ status: "active" })
        .where(eq(schema.pollingAgents.id, agent.id));

      res.json({
        success: true,
        data: {
          totalElections: batchSummary.length,
          submissions: batchSummary,
          pollingUnitId,
          reportedBy: agent.memberId,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      console.error("Batch result submission error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to submit batch results" });
    }
  });

  app.post("/api/agent/upload-result-sheet", apiLimiter, upload.single("resultSheet"), async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin, electionId, pollingUnitId } = req.body;

      if (!agentCode || !agentPin || !electionId || !pollingUnitId) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
        with: { member: true }
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid agent credentials" });
      }
      if (agent.status === "revoked") {
        return res.status(403).json({ success: false, error: "Agent access has been revoked" });
      }
      if (agent.pollingUnitId !== pollingUnitId) {
        return res.status(403).json({ success: false, error: "You are not assigned to this polling unit" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileName = `result-sheets/${pollingUnitId}/${electionId}/${Date.now()}_${req.file.originalname}`;
      const base64Data = fileBuffer.toString("base64");
      const fileUrl = `data:${req.file.mimetype};base64,${base64Data}`;

      const [sheet] = await db.insert(schema.resultSheets).values({
        pollingUnitId,
        electionId,
        uploadedBy: agent.memberId,
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      }).returning();

      io.emit("result-sheet:uploaded", { electionId, pollingUnitId, sheetId: sheet.id });

      res.json({
        success: true,
        data: {
          id: sheet.id,
          fileName: sheet.fileName,
          electionId,
          pollingUnitId,
          uploadedAt: sheet.uploadedAt,
        }
      });
    } catch (error: any) {
      console.error("Result sheet upload error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to upload result sheet" });
    }
  });

  app.get("/api/agent/result-sheets", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin } = req.query;

      if (!agentCode || !agentPin) {
        return res.status(400).json({ success: false, error: "Agent credentials required" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, (agentCode as string).toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin as string)
        ),
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const sheets = await db.query.resultSheets.findMany({
        where: eq(schema.resultSheets.pollingUnitId, agent.pollingUnitId),
        with: { election: true },
        orderBy: desc(schema.resultSheets.uploadedAt),
      });

      res.json({
        success: true,
        data: sheets.map(s => ({
          id: s.id,
          electionId: s.electionId,
          electionTitle: s.election.title,
          electionPosition: s.election.position,
          fileName: s.fileName,
          isVerified: s.isVerified,
          uploadedAt: s.uploadedAt,
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to fetch result sheets" });
    }
  });

  app.post("/api/admin/result-sheets/:id/verify", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { notes } = req.body;
      const [sheet] = await db.update(schema.resultSheets)
        .set({
          isVerified: true,
          verifiedBy: req.user!.id,
          verifiedAt: new Date(),
          verificationNotes: notes || null,
        })
        .where(eq(schema.resultSheets.id, req.params.id))
        .returning();

      res.json({ success: true, data: sheet });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to verify result sheet" });
    }
  });

  app.post("/api/admin/polling-unit-results/:id/verify", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { notes } = req.body;

      const [result] = await db.update(schema.pollingUnitResults)
        .set({
          isVerified: true,
          verifiedBy: req.user!.id,
          verifiedAt: new Date(),
          verificationNotes: notes || null,
        })
        .where(eq(schema.pollingUnitResults.id, req.params.id))
        .returning();

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to verify result" });
    }
  });

  // Enhanced Situation Room - Polling Units with hierarchy
  app.get("/api/situation-room/polling-units-enhanced", async (req: Request, res: Response) => {
    try {
      const { stateId, lgaId, wardId, status, search, page = "1", limit = "50" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const offset = (pageNum - 1) * limitNum;

      let whereClause = sql`1=1`;

      if (stateId) {
        whereClause = sql`${whereClause} AND s.id = ${stateId}`;
      }
      if (lgaId) {
        whereClause = sql`${whereClause} AND l.id = ${lgaId}`;
      }
      if (wardId) {
        whereClause = sql`${whereClause} AND w.id = ${wardId}`;
      }
      if (status && status !== "all") {
        whereClause = sql`${whereClause} AND pu.status = ${status}`;
      }
      if (search) {
        whereClause = sql`${whereClause} AND (pu.name ILIKE ${'%' + search + '%'} OR pu.unit_code ILIKE ${'%' + search + '%'})`;
      }

      const unitsResult = await db.execute(sql`
        SELECT 
          pu.id,
          pu.name,
          pu.unit_code as "unitCode",
          pu.status,
          pu.votes,
          pu.last_update as "lastUpdate",
          w.id as "wardId",
          w.name as "wardName",
          l.id as "lgaId",
          l.name as "lgaName",
          s.id as "stateId",
          s.name as "stateName",
          (SELECT COUNT(*) FROM polling_unit_results pur WHERE pur.polling_unit_id = pu.id) as "resultsCount",
          (SELECT COUNT(*) FROM polling_unit_results pur WHERE pur.polling_unit_id = pu.id AND pur.is_verified = true) as "verifiedResults",
          (SELECT json_agg(json_build_object(
            'agentId', pa.id,
            'agentCode', pa.agent_code,
            'status', pa.status,
            'memberName', u.first_name || ' ' || u.last_name,
            'checkedInAt', pa.checked_in_at
          )) FROM polling_agents pa 
          JOIN members m2 ON pa.member_id = m2.id
          JOIN users u ON m2.user_id = u.id
          WHERE pa.polling_unit_id = pu.id AND pa.status != 'revoked') as agents
        FROM polling_units pu
        JOIN wards w ON pu.ward_id = w.id
        JOIN lgas l ON w.lga_id = l.id
        JOIN states s ON l.state_id = s.id
        WHERE ${whereClause}
        ORDER BY s.name, l.name, w.name, pu.name
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM polling_units pu
        JOIN wards w ON pu.ward_id = w.id
        JOIN lgas l ON w.lga_id = l.id
        JOIN states s ON l.state_id = s.id
        WHERE ${whereClause}
      `);

      const total = Number((countResult.rows as any[])[0]?.total) || 0;

      res.json({
        success: true,
        data: unitsResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to fetch polling units" });
    }
  });

  app.get("/api/situation-room/polling-units/:id/traceability", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const results = await db.execute(sql`
        SELECT 
          pur.id,
          pur.votes,
          pur.registered_voters as "registeredVoters",
          pur.accredited_voters as "accreditedVoters",
          pur.is_verified as "isVerified",
          pur.verified_at as "verifiedAt",
          pur.verification_notes as "verificationNotes",
          pur.reported_at as "reportedAt",
          pur.updated_at as "updatedAt",
          pur.device_info as "deviceInfo",
          p.name as "partyName",
          p.abbreviation as "partyAbbreviation",
          p.color as "partyColor",
          gec.candidate_name as "candidateName",
          ge.title as "electionTitle",
          CASE WHEN pur.reported_by IS NOT NULL THEN
            json_build_object(
              'memberId', m.id,
              'memberCode', m.member_id,
              'name', u.first_name || ' ' || u.last_name,
              'email', u.email,
              'phone', u.phone
            )
          ELSE NULL END as reporter,
          CASE WHEN pur.verified_by IS NOT NULL THEN
            json_build_object(
              'userId', uv.id,
              'name', uv.first_name || ' ' || uv.last_name,
              'email', uv.email
            )
          ELSE NULL END as verifier
        FROM polling_unit_results pur
        JOIN parties p ON pur.party_id = p.id
        JOIN general_election_candidates gec ON pur.candidate_id = gec.id
        JOIN general_elections ge ON pur.election_id = ge.id
        LEFT JOIN members m ON pur.reported_by = m.id
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN users uv ON pur.verified_by = uv.id
        WHERE pur.polling_unit_id = ${req.params.id}
        ORDER BY ge.title, p.abbreviation
      `);

      const agents = await db.execute(sql`
        SELECT 
          pa.id,
          pa.agent_code as "agentCode",
          pa.status,
          pa.checked_in_at as "checkedInAt",
          pa.completed_at as "completedAt",
          pa.assigned_at as "assignedAt",
          pa.notes,
          u.first_name || ' ' || u.last_name as "agentName",
          u.email as "agentEmail",
          u.phone as "agentPhone",
          m.member_id as "memberCode",
          ge.title as "electionTitle"
        FROM polling_agents pa
        JOIN members m ON pa.member_id = m.id
        JOIN users u ON m.user_id = u.id
        LEFT JOIN general_elections ge ON pa.election_id = ge.id
        WHERE pa.polling_unit_id = ${req.params.id}
        ORDER BY pa.assigned_at DESC
      `);

      const incidents = await db.query.incidents.findMany({
        where: eq(schema.incidents.pollingUnitId, req.params.id),
        with: { reporter: { with: { user: true } }, media: true },
        orderBy: desc(schema.incidents.createdAt),
      });

      res.json({
        success: true,
        data: {
          results: results.rows,
          agents: agents.rows,
          incidents,
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to fetch traceability data" });
    }
  });

  // ===================== ELECTION DAY MODE =====================

  app.get("/api/election-day-mode", async (req: Request, res: Response) => {
    try {
      const setting = await db.query.appSettings.findFirst({
        where: eq(schema.appSettings.key, "election_day_mode"),
      });

      if (!setting) {
        return res.json({
          success: true,
          data: { active: false, electionId: null, activatedAt: null, message: null },
        });
      }

      const value = setting.value as any;
      
      let election = null;
      if (value.active && value.electionId) {
        election = await db.query.generalElections.findFirst({
          where: eq(schema.generalElections.id, value.electionId),
        });
      }

      res.json({
        success: true,
        data: {
          active: value.active || false,
          electionId: value.electionId || null,
          activatedAt: value.activatedAt || null,
          message: value.message || null,
          election: election ? {
            id: election.id,
            title: election.title,
            position: election.position,
            status: election.status,
            electionDate: election.electionDate,
          } : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to fetch election day mode" });
    }
  });

  app.put("/api/election-day-mode", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { active, electionId, message } = req.body;

      if (active && !electionId) {
        return res.status(400).json({ success: false, error: "An election must be selected to activate Election Day Mode" });
      }

      if (active && electionId) {
        const election = await db.query.generalElections.findFirst({
          where: eq(schema.generalElections.id, electionId),
        });
        if (!election) {
          return res.status(404).json({ success: false, error: "Election not found" });
        }
      }

      const value = {
        active: !!active,
        electionId: active ? electionId : null,
        message: message || null,
        activatedAt: active ? new Date().toISOString() : null,
      };

      await db.insert(schema.appSettings)
        .values({ key: "election_day_mode", value, updatedAt: new Date(), updatedBy: req.user!.id })
        .onConflictDoUpdate({
          target: schema.appSettings.key,
          set: { value, updatedAt: new Date(), updatedBy: req.user!.id },
        });

      if (active) {
        io.emit("election-day-mode:activated", value);
      } else {
        io.emit("election-day-mode:deactivated", {});
      }

      res.json({ success: true, data: value });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to update election day mode" });
    }
  });

  app.post("/api/agent/check-in", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin, latitude, longitude } = req.body;

      if (!agentCode || !agentPin) {
        return res.status(400).json({ success: false, error: "Agent code and PIN required" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      await db.update(schema.pollingAgents)
        .set({
          status: "checked_in",
          checkedInAt: new Date(),
          notes: latitude && longitude ? `Location: ${latitude},${longitude}` : agent.notes,
        })
        .where(eq(schema.pollingAgents.id, agent.id));

      io.emit("agent:checked-in", { agentId: agent.id, pollingUnitId: agent.pollingUnitId });

      res.json({ success: true, data: { message: "Check-in successful" } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Check-in failed" });
    }
  });

  app.post("/api/agent/report-incident", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin, severity, description, location, latitude, longitude } = req.body;

      if (!agentCode || !agentPin || !severity || !description) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, agentCode.toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin)
        ),
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const [incident] = await db.insert(schema.incidents).values({
        pollingUnitId: agent.pollingUnitId,
        reporterId: agent.memberId,
        severity: severity as any,
        description,
        location: location || null,
        coordinates: latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null,
        status: "reported",
      }).returning();

      io.emit("incident:new", incident);

      res.json({ success: true, data: incident });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Failed to report incident" });
    }
  });

  app.get("/api/agent/my-incidents", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { agentCode, agentPin } = req.query;

      if (!agentCode || !agentPin) {
        return res.status(400).json({ success: false, error: "Agent credentials required" });
      }

      const agent = await db.query.pollingAgents.findFirst({
        where: and(
          eq(schema.pollingAgents.agentCode, (agentCode as string).toUpperCase()),
          eq(schema.pollingAgents.agentPin, agentPin as string)
        ),
      });

      if (!agent) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }

      const incidents = await db.query.incidents.findMany({
        where: eq(schema.incidents.reporterId, agent.memberId),
        orderBy: desc(schema.incidents.createdAt),
      });

      res.json({ success: true, data: incidents });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to fetch incidents" });
    }
  });

  // Apply error handler middleware (must be last)
  app.use(errorHandler);

  io.on("connection", (socket) => {
    console.log("Client connected to situation room");

    socket.on("disconnect", () => {
      console.log("Client disconnected from situation room");
    });
  });

  return httpServer;
}
