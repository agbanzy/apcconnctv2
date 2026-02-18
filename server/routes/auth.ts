import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, getRefreshTokenExpiry, hashRefreshToken, verifyRefreshTokenHash } from "../jwt-utils";
import { authLimiter } from "../middleware/rate-limit";
import { logAudit, AuditActions } from "../utils/audit-logger";

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

const router = Router();

// Middleware to require authentication
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated?.() && !req.user) {
    const jwtAuthError = (req as any).jwtAuthError;
    return res.status(401).json({
      success: false,
      error: jwtAuthError || "Unauthorized",
    });
  }
  next();
};

// Middleware to require specific roles
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role || "member")) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  };
};

// Utility functions
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

// Register route
router.post("/api/auth/register", authLimiter, async (req: AuthRequest, res: Response) => {
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

// Login route
router.post("/api/auth/login", authLimiter, (req: AuthRequest, res: Response, next: NextFunction) => {
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

      return res.json({ success: true, data: { user, member } });
    });
  })(req, res, next);
});

// Logout route
router.post("/api/auth/logout", (req: AuthRequest, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Logout failed" });
    }
    res.json({ success: true, data: { message: "Logged out successfully" } });
  });
});

// Mobile register route
router.post("/api/auth/mobile/register", authLimiter, async (req: AuthRequest, res: Response) => {
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

// Mobile login route
router.post("/api/auth/mobile/login", async (req: AuthRequest, res: Response) => {
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

// Mobile token refresh route
router.post("/api/auth/mobile/refresh", async (req: AuthRequest, res: Response) => {
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

// Mobile logout route
router.post("/api/auth/mobile/logout", async (req: AuthRequest, res: Response) => {
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

// Get authenticated user route
router.get("/api/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
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

// Get user profile route
router.get("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
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

export default router;
