import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { Server as SocketIOServer } from "socket.io";
// @ts-ignore - No types available for paystack-api
import Paystack from "paystack-api";
import multer from "multer";
import QRCode from "qrcode";
import OpenAI from "openai";
import crypto from "crypto";
import { db } from "./db";
import { pool } from "./db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";
import { ninService, validateNINFormat, NINVerificationErrorCode } from "./nin-service";
// PUSH NOTIFICATION INTEGRATION: Import push service
// Uncomment the following line when ready to use push notifications:
// import { pushService, NotificationTemplates } from "./push-service";

const PgSession = ConnectPgSimple(session);
const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY as string);

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
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
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

  app.post("/api/auth/register", async (req: AuthRequest, res: Response) => {
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

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ success: false, error: "Login failed after registration" });
        }
        return res.json({ success: true, data: { user, member } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: AuthRequest, res: Response, next: NextFunction) => {
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

      res.json({ success: true, data: { user: req.user, member } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch user data" });
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

  // NIN VERIFICATION ENDPOINT
  // ==========================
  // This endpoint handles NIN verification for members using the NIMC API integration
  app.post("/api/members/:id/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { nin, dateOfBirth } = req.body;

      // Get member to verify
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, req.params.id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      // Authorization check: Only the member themselves or an admin can verify NIN
      if (member.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      // Check if already verified
      if (member.ninVerified) {
        return res.json({
          success: true,
          data: {
            verified: true,
            message: "NIN already verified",
            verifiedAt: member.ninVerifiedAt
          }
        });
      }

      // RATE LIMITING: Check verification attempts
      // Maximum 10 attempts per member (configurable)
      const MAX_VERIFICATION_ATTEMPTS = 10;
      if ((member.ninVerificationAttempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
        return res.status(429).json({
          success: false,
          error: `Maximum verification attempts (${MAX_VERIFICATION_ATTEMPTS}) exceeded. Please contact support.`
        });
      }

      // STEP 1: Check if NIN is already used by another member
      const ninStatus = await ninService.checkNINStatus(nin);
      if (ninStatus.exists && ninStatus.memberId !== member.memberId) {
        return res.status(400).json({
          success: false,
          error: "This NIN is already registered to another member"
        });
      }

      const user = Array.isArray(member.user) ? member.user[0] : member.user;

      // STEP 2: Verify NIN with NIMC API
      const verificationResult = await ninService.verifyNIN({
        nin,
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        dateOfBirth: dateOfBirth || ""
      });

      // STEP 3: Update member record based on verification result
      // Increment verification attempts regardless of success/failure
      const attempts = (member.ninVerificationAttempts || 0) + 1;

      if (verificationResult.success && verificationResult.data?.verified) {
        // SUCCESS: Update member with verified NIN
        const [updated] = await db.update(schema.members)
          .set({
            nin: verificationResult.data.nin,
            ninVerified: true,
            ninVerifiedAt: new Date(),
            ninVerificationAttempts: attempts,
            status: "active" // Activate member account upon successful NIN verification
          })
          .where(eq(schema.members.id, req.params.id))
          .returning();

        console.log(`NIN verified successfully for member ${member.memberId}`);

        // OPTIONAL: Send notification to member
        // await emailService.sendNINVerificationSuccess(user.email, member.memberId);

        return res.json({
          success: true,
          data: {
            verified: true,
            member: updated,
            message: verificationResult.message
          }
        });
      } else {
        // FAILURE: Update only the attempt counter, do not save the NIN
        await db.update(schema.members)
          .set({
            ninVerificationAttempts: attempts
          })
          .where(eq(schema.members.id, req.params.id));

        // RETRY LOGIC: Inform user of remaining attempts
        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - attempts;
        console.log(`NIN verification failed for member ${member.memberId}. Remaining attempts: ${remainingAttempts}`);

        return res.status(400).json({
          success: false,
          error: verificationResult.message,
          code: verificationResult.code,
          remainingAttempts
        });
      }
    } catch (error) {
      console.error("NIN verification error:", error);
      res.status(500).json({
        success: false,
        error: "NIN verification failed. Please try again later."
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

  // Get current member with referral code
  app.get("/api/members/me", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id),
        with: { user: true, ward: { with: { lga: { with: { state: true } } } } }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      res.json({ success: true, data: member });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch member" });
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

      const [payment] = await db.insert(schema.membershipDues).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        amount: String(amount * 100),
        paymentStatus: "pending",
        paymentMethod: "paystack",
        dueDate: new Date(),
      }).returning();

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      const paystackResponse = await paystack.transaction.initialize({
        email: user?.email || "",
        amount: amount * 100,
        reference: payment.id,
        callback_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/dues/verify`,
        metadata: {
          payment_id: payment.id,
          member_id: member.id,
          type: "membership_dues",
        }
      });

      res.json({
        success: true,
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
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

      const verification = await paystack.transaction.verify(reference);

      if (verification.data.status === "success") {
        await db.update(schema.membershipDues)
          .set({
            paymentStatus: "completed",
            paystackReference: reference,
            paidAt: new Date(),
          })
          .where(eq(schema.membershipDues.id, reference));

        const payment = await db.query.membershipDues.findFirst({
          where: eq(schema.membershipDues.id, reference)
        });

        if (payment) {
          await db.update(schema.members)
            .set({ status: "active" })
            .where(eq(schema.members.id, payment.memberId));
        }

        res.json({ success: true, data: { payment } });
      } else {
        await db.update(schema.membershipDues)
          .set({ paymentStatus: "failed" })
          .where(eq(schema.membershipDues.id, reference));

        res.status(400).json({ success: false, error: "Payment verification failed" });
      }
    } catch (error: any) {
      console.error("Dues verification error:", error);
      res.status(500).json({ success: false, error: "Failed to verify payment" });
    }
  });

  app.post("/api/paystack/webhook", async (req: Request, res: Response) => {
    try {
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY as string)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event = req.body;

      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const metadata = event.data.metadata;

        if (metadata.type === "membership_dues") {
          await db.update(schema.membershipDues)
            .set({ paymentStatus: "completed", paidAt: new Date() })
            .where(eq(schema.membershipDues.id, reference));
        } else if (metadata.donation_id) {
          await db.update(schema.donations)
            .set({ paymentStatus: "completed" })
            .where(eq(schema.donations.id, reference));
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

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const events = await db.query.events.findMany({
        orderBy: desc(schema.events.date)
      });
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
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

      res.json({ success: true, data: { ...event, rsvpCount: rsvpCount[0]?.count || 0 } });
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

  app.get("/api/elections", async (req: Request, res: Response) => {
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

      res.json({ success: true, data: elections });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch elections" });
    }
  });

  app.get("/api/elections/:id", async (req: Request, res: Response) => {
    try {
      const election = await db.query.elections.findFirst({
        where: eq(schema.elections.id, req.params.id),
        with: { candidates: true }
      });

      if (!election) {
        return res.status(404).json({ success: false, error: "Election not found" });
      }

      res.json({ success: true, data: election });
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
      res.status(400).json({ success: false, error: "Failed to create election" });
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

  app.post("/api/elections/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
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

  app.get("/api/quizzes/:id", async (req: Request, res: Response) => {
    try {
      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      res.json({ success: true, data: quiz });
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

  app.post("/api/quizzes/:id/attempt", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { selectedAnswer } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const quiz = await db.query.quizzes.findFirst({
        where: eq(schema.quizzes.id, req.params.id)
      });

      if (!quiz) {
        return res.status(404).json({ success: false, error: "Quiz not found" });
      }

      const isCorrect = selectedAnswer === quiz.correctAnswer;
      const pointsEarned = isCorrect ? quiz.points : 0;

      const [attempt] = await db.insert(schema.quizAttempts).values({
        quizId: req.params.id,
        memberId: member.id,
        selectedAnswer,
        isCorrect,
        pointsEarned
      }).returning();

      if (isCorrect) {
        await db.insert(schema.userPoints).values({
          memberId: member.id,
          source: "quiz",
          amount: pointsEarned,
          points: pointsEarned
        });
      }

      res.json({ success: true, data: { attempt, isCorrect, pointsEarned } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to submit quiz attempt" });
    }
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const { difficulty, status } = req.query;
      let tasks;

      if (difficulty) {
        tasks = await db.query.volunteerTasks.findMany({
          where: eq(schema.volunteerTasks.difficulty, difficulty as any),
          orderBy: desc(schema.volunteerTasks.createdAt)
        });
      } else {
        tasks = await db.query.volunteerTasks.findMany({
          orderBy: desc(schema.volunteerTasks.createdAt)
        });
      }

      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const task = await db.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch task" });
    }
  });

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

      await db.insert(schema.userPoints).values({
        memberId,
        source: "task",
        amount: task.points,
        points: task.points
      });

      res.json({ success: true, data: { message: "Task approved and points awarded" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to approve task" });
    }
  });

  app.get("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let campaigns;

      if (status) {
        campaigns = await db.query.issueCampaigns.findMany({
          where: eq(schema.issueCampaigns.status, status as any),
          orderBy: desc(schema.issueCampaigns.createdAt),
          with: { author: { with: { user: true } } }
        });
      } else {
        campaigns = await db.query.issueCampaigns.findMany({
          orderBy: desc(schema.issueCampaigns.createdAt),
          with: { author: { with: { user: true } } }
        });
      }

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

      const campaignData = schema.insertCampaignSchema.parse({
        ...req.body,
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

  app.post("/api/campaigns/:id/vote", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const existing = await db.query.campaignVotes.findFirst({
        where: and(
          eq(schema.campaignVotes.campaignId, req.params.id),
          eq(schema.campaignVotes.memberId, member.id)
        )
      });

      if (existing) {
        return res.status(400).json({ success: false, error: "You have already voted on this campaign" });
      }

      const [vote] = await db.insert(schema.campaignVotes).values({
        campaignId: req.params.id,
        memberId: member.id
      }).returning();

      await db.update(schema.issueCampaigns)
        .set({ currentVotes: sql`${schema.issueCampaigns.currentVotes} + 1` })
        .where(eq(schema.issueCampaigns.id, req.params.id));

      res.json({ success: true, data: vote });
    } catch (error) {
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

  app.get("/api/micro-tasks", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const tasks = await db.query.microTasks.findMany({
        orderBy: desc(schema.microTasks.createdAt)
      });
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch micro-tasks" });
    }
  });

  app.post("/api/micro-tasks/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { proofUrl } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [completion] = await db.insert(schema.taskCompletions).values({
        taskId: req.params.id,
        memberId: member.id,
        proofUrl,
        status: "pending"
      }).returning();

      res.json({ success: true, data: completion });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to complete micro-task" });
    }
  });

  app.patch("/api/micro-tasks/:id/verify", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
    try {
      const { completionId } = req.body;

      const completion = await db.query.taskCompletions.findFirst({
        where: eq(schema.taskCompletions.id, completionId),
        with: { task: true }
      });

      if (!completion) {
        return res.status(404).json({ success: false, error: "Completion not found" });
      }

      await db.update(schema.taskCompletions)
        .set({ status: "approved" })
        .where(eq(schema.taskCompletions.id, completionId));

      const task = Array.isArray(completion.task) ? completion.task[0] : completion.task;
      await db.insert(schema.userPoints).values({
        memberId: completion.memberId,
        source: "micro-task",
        amount: task?.points || 0,
        points: task?.points || 0
      });

      res.json({ success: true, data: { message: "Micro-task verified and points awarded" } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to verify micro-task" });
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

  app.post("/api/incidents", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const incidentData = schema.insertIncidentSchema.parse({
        ...req.body,
        reporterId: member.id
      });

      const [incident] = await db.insert(schema.incidents).values(incidentData).returning();

      io.emit("incident:new", incident);

      res.json({ success: true, data: incident });
    } catch (error) {
      res.status(400).json({ success: false, error: "Failed to report incident" });
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
          totalUnits: totalUnits[0]?.count || 0,
          activeUnits: activeUnits[0]?.count || 0,
          completedUnits: completedUnits[0]?.count || 0,
          incidentUnits: incidentUnits[0]?.count || 0,
          totalVotes: totalVotes[0]?.total || 0,
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
      const posts = await db.query.newsPosts.findMany({
        orderBy: desc(schema.newsPosts.publishedAt),
        with: { author: true }
      });
      res.json({ success: true, data: posts });
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

      res.json({ success: true, data: { ...post, engagement } });
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
          totalMembers: totalMembers[0]?.count || 0,
          activeMembers: activeMembers[0]?.count || 0,
          totalEvents: totalEvents[0]?.count || 0,
          totalElections: totalElections[0]?.count || 0,
          totalVotes: totalVotes[0]?.count || 0
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
          totalRsvps: totalRsvps[0]?.count || 0,
          totalQuizAttempts: totalQuizAttempts[0]?.count || 0,
          totalTaskApplications: totalTaskApplications[0]?.count || 0,
          totalCampaignVotes: totalCampaignVotes[0]?.count || 0
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
          totalMembers: totalMembers[0]?.count || 0,
          activeMembers: activeMembers[0]?.count || 0,
          totalEvents: totalEvents[0]?.count || 0,
          upcomingEvents: upcomingEvents[0]?.count || 0,
          totalElections: totalElections[0]?.count || 0,
          totalVotes: totalVotes[0]?.count || 0,
          activeCampaigns: activeCampaigns[0]?.count || 0,
          totalIdeas: totalIdeas[0]?.count || 0,
          statesWithPresence: statesWithPresence[0]?.count || 0,
          wardsCovered: wardsCovered[0]?.count || 0,
          totalEngagementPoints: totalEngagementPoints[0]?.total || 0
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

        // Note: Events table doesn't have stateId column, so we can't filter by state
        const upcomingEventsByState = [{ count: 0 }];

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

        return {
          stateId: state.id,
          name: state.name,
          code: state.code,
          memberCount: membersByState[0]?.count || 0,
          activeMembers: activeMembersByState[0]?.count || 0,
          upcomingEvents: upcomingEventsByState[0]?.count || 0,
          activeCampaigns: activeCampaignsByState[0]?.count || 0,
          lgasCovered: lgasCovered[0]?.count || 0,
          wardsCovered: wardsCovered[0]?.count || 0
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
          author: {
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
          memberCount: memberCount[0]?.count || 0,
          activeMembers: activeMembers[0]?.count || 0,
          upcomingEvents: upcomingEvents[0]?.count || 0,
          activeCampaigns: activeCampaigns[0]?.count || 0,
          lgasCovered: lgasCovered[0]?.count || 0,
          wardsCovered: wardsCovered[0]?.count || 0
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

          if (badge.points > 0) {
            await db.insert(schema.userPoints).values({
              memberId: member.id,
              source: "badge",
              amount: badge.points
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

      const [points] = await db.insert(schema.userPoints).values({
        memberId,
        source,
        amount
      }).returning();

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
            await db.insert(schema.userPoints).values({
              memberId: member.id,
              source: "achievement",
              amount: achievement.points
            });
            newlyCompleted.push({ ...userAchievement, achievement });
          }
        } else if (!existing.completed && completed) {
          await db.update(schema.userAchievements)
            .set({ completed: true, completedAt: new Date(), progress })
            .where(eq(schema.userAchievements.id, existing.id));

          await db.insert(schema.userPoints).values({
            memberId: member.id,
            source: "achievement",
            amount: achievement.points
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
        with: { member: true }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      const ideaMember = Array.isArray(idea.member) ? idea.member[0] : idea.member;
      if (ideaMember?.userId !== req.user!.id && req.user!.role !== "admin") {
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
        with: { member: true }
      });

      if (!idea) {
        return res.status(404).json({ success: false, error: "Idea not found" });
      }

      const ideaMember = Array.isArray(idea.member) ? idea.member[0] : idea.member;
      if (ideaMember?.userId !== req.user!.id && req.user!.role !== "admin") {
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
      const { amount, campaign_id, is_anonymous, message } = req.body;
      const member_id = req.user!.id;

      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, member_id),
        with: { user: true }
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const [donation] = await db.insert(schema.donations).values({
        id: crypto.randomUUID(),
        memberId: member.id,
        campaignId: campaign_id || null,
        amount: amount * 100,
        currency: "NGN",
        paymentMethod: "paystack",
        paymentStatus: "pending",
        isAnonymous: is_anonymous || false,
        message: message || null,
      }).returning();

      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      const paystackResponse = await paystack.transaction.initialize({
        email: user?.email || "",
        amount: amount * 100,
        reference: donation.id,
        callback_url: `${process.env.VITE_BASE_URL || "http://localhost:5000"}/donations/verify`,
        metadata: {
          donation_id: donation.id,
          campaign_id: campaign_id || null,
          member_id: member.id,
        }
      });

      res.json({
        success: true,
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
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

      const verification = await paystack.transaction.verify(reference);

      if (verification.data.status === "success") {
        await db.update(schema.donations)
          .set({
            paymentStatus: "completed",
            paystackReference: reference,
          })
          .where(eq(schema.donations.id, reference));

        const donation = await db.query.donations.findFirst({
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

      // Process Paystack refund if payment was via Paystack
      if (donation.paymentMethod === "paystack" && donation.paystackReference) {
        try {
          await paystack.refund.create({
            transaction: donation.paystackReference,
            amount: donation.amount, // amount in kobo
          });
        } catch (paystackError: any) {
          console.error("Paystack refund error:", paystackError);
          return res.status(400).json({ success: false, error: "Paystack refund failed: " + paystackError.message });
        }
      } else if (donation.paymentMethod !== "paystack") {
        // For bank transfers or other payment methods, manual refund required
        return res.status(400).json({ 
          success: false, 
          error: "Automated refunds only available for Paystack payments. Please process manual refund." 
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

Be friendly, informative, and politically neutral when discussing governance. Encourage democratic participation and civic engagement. Keep responses concise and helpful.${memberContext}`
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
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const tasks = await db.query.microTasks.findMany({
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
      const taskData = schema.insertMicroTaskSchema.parse(req.body);
      const [task] = await db.insert(schema.microTasks).values(taskData).returning();
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Create micro-task error:", error);
      res.status(500).json({ success: false, error: "Failed to create micro-task" });
    }
  });

  app.post("/api/tasks/micro/:id/complete", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { selectedAnswers } = req.body;
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, req.user!.id)
      });

      if (!member) {
        return res.status(404).json({ success: false, error: "Member not found" });
      }

      const task = await db.query.microTasks.findFirst({
        where: eq(schema.microTasks.id, req.params.id)
      });

      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }

      const existingCompletion = await db.query.taskCompletions.findFirst({
        where: and(
          eq(schema.taskCompletions.taskId, req.params.id),
          eq(schema.taskCompletions.memberId, member.id),
          eq(schema.taskCompletions.taskType, "micro")
        )
      });

      if (existingCompletion) {
        return res.status(400).json({ success: false, error: "Task already completed" });
      }

      const correctAnswers = task.correctAnswers as number[] || [];
      const isCorrect = JSON.stringify(selectedAnswers.sort()) === JSON.stringify(correctAnswers.sort());
      const pointsEarned = isCorrect ? task.points : 0;

      const [completion] = await db.insert(schema.taskCompletions).values({
        taskId: req.params.id,
        taskType: "micro",
        memberId: member.id,
        pointsEarned,
        verified: true,
        status: isCorrect ? "approved" : "rejected"
      }).returning();

      if (isCorrect) {
        await db.insert(schema.userPoints).values({
          memberId: member.id,
          source: "micro-task",
          amount: pointsEarned,
          points: pointsEarned
        });
      }

      res.json({ 
        success: true, 
        data: { 
          completion, 
          isCorrect, 
          pointsEarned,
          correctAnswers: isCorrect ? undefined : correctAnswers
        } 
      });
    } catch (error) {
      console.error("Complete micro-task error:", error);
      res.status(500).json({ success: false, error: "Failed to complete micro-task" });
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
      const { status, location, category } = req.query;
      let query = db.query.volunteerTasks;
      
      const tasks = await query.findMany({
        orderBy: desc(schema.volunteerTasks.createdAt),
        with: {
          creator: true
        }
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
          },
          creator: true
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
      const [task] = await db.insert(schema.volunteerTasks).values(taskData).returning();
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
        status: "pending"
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
        await db.insert(schema.userPoints).values({
          memberId: completion.memberId,
          source: "volunteer-task",
          amount: pointsEarned,
          points: pointsEarned
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
            author: true
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

  io.on("connection", (socket) => {
    console.log("Client connected to situation room");

    socket.on("disconnect", () => {
      console.log("Client disconnected from situation room");
    });
  });

  return httpServer;
}
