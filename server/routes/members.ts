import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or as drizzleOr, sql, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { emailService } from "../email-service";
import { ninService, validateNINFormat, NINVerificationErrorCode } from "../nin-service";
import { pushService } from "../push-service";
import { logAudit, AuditActions } from "../utils/audit-logger";

import { requireAuth, requireRole } from "./auth";

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

const MAX_VERIFICATION_ATTEMPTS = 10;

// Utility to generate ID card token (should be imported from main routes)
let generateIdCardToken: (memberId: string, nonce: string) => string;

// Helper to normalize related values
const normalizeRelatedValue = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

// Get all members (with optional filters)
router.get("/api/members", requireAuth, async (req: AuthRequest, res: Response) => {
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
router.get("/api/members/me", requireAuth, async (req: AuthRequest, res: Response) => {
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

    const { password: _password, ...safeUser } = req.user!;
    res.json({ success: true, data: { user: safeUser, member } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch member" });
  }
});

// Get member points
router.get("/api/members/points", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const latestTransaction = await db.query.userPoints.findFirst({
      where: eq(schema.userPoints.memberId, member.id),
      orderBy: desc(schema.userPoints.createdAt)
    });
    const pointBalance = latestTransaction?.balanceAfter || 0;

    const pointHistory = await db.query.userPoints.findMany({
      where: eq(schema.userPoints.memberId, member.id),
      orderBy: desc(schema.userPoints.createdAt),
      limit: 50
    });

    const totalPointsEarned = pointHistory
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        currentBalance: pointBalance,
        totalEarned: totalPointsEarned,
        recentTransactions: pointHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch member points" });
  }
});

// Get single member by ID
router.get("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id),
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

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const { user: _user, ...memberWithoutUser } = member as any;
    const { password: _password, ...userWithoutPassword } = member.user as any;

    res.json({
      success: true,
      data: {
        member: memberWithoutUser,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch member" });
  }
});

// Update member
router.patch("/api/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, email, dateOfBirth } = req.body;

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    if (req.user!.id !== member.userId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updateData: any = {};
    const userUpdateData: any = {};

    if (phone) userUpdateData.phone = phone;
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (email) userUpdateData.email = email;

    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

    if (Object.keys(userUpdateData).length > 0) {
      await db.update(schema.users)
        .set(userUpdateData)
        .where(eq(schema.users.id, member.userId));
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(schema.members)
        .set(updateData)
        .where(eq(schema.members.id, req.params.id));
    }

    const updatedMember = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id),
      with: { user: true, ward: true }
    });

    res.json({ success: true, data: updatedMember });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update member" });
  }
});

// Suspend member
router.post("/api/members/:id/suspend", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    await db.update(schema.members)
      .set({ status: "suspended" })
      .where(eq(schema.members.id, req.params.id));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.SUSPEND_MEMBER,
      details: { targetMemberId: member.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Member suspended" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to suspend member" });
  }
});

// Activate member
router.post("/api/members/:id/activate", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    await db.update(schema.members)
      .set({ status: "active" })
      .where(eq(schema.members.id, req.params.id));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.ACTIVATE_MEMBER,
      details: { targetMemberId: member.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Member activated" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to activate member" });
  }
});

// Delete member (soft delete)
router.post("/api/members/:id/delete", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    await db.update(schema.members)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(schema.members.id, req.params.id));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.DELETE_MEMBER,
      details: { targetMemberId: member.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Member deleted" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete member" });
  }
});

// Restore member
router.post("/api/members/:id/restore", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    await db.update(schema.members)
      .set({ status: "active", deletedAt: null })
      .where(eq(schema.members.id, req.params.id));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.RESTORE_MEMBER,
      details: { targetMemberId: member.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Member restored" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to restore member" });
  }
});

// Reset member password
router.post("/api/members/:id/reset-password", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id),
      with: { user: true }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(schema.users)
      .set({ password: hashedPassword })
      .where(eq(schema.users.id, member.userId));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.RESET_PASSWORD,
      details: { targetMemberId: member.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Password reset successfully" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// Verify NIN for member
router.post("/api/members/:id/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nin, dateOfBirth } = req.body;

    if (!nin || !dateOfBirth) {
      return res.status(400).json({ success: false, error: "NIN and date of birth are required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id),
      with: { user: true }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    if (req.user!.id !== member.userId && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Check verification attempt limit
    const attempts = member.ninVerificationAttempts || 0;
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: `Maximum verification attempts (${MAX_VERIFICATION_ATTEMPTS}) exceeded. Contact support.`
      });
    }

    if (!validateNINFormat(nin)) {
      return res.status(400).json({ success: false, error: "Invalid NIN format" });
    }

    try {
      const verificationResult = await ninService.verifyNIN({
        nin,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        dateOfBirth
      });

      if (verificationResult.success && verificationResult.data?.verified) {
        await db.update(schema.members)
          .set({
            nin: verificationResult.data.nin,
            ninVerified: true,
            ninVerifiedAt: new Date(),
            ninVerificationAttempts: attempts + 1,
            status: "active"
          })
          .where(eq(schema.members.id, member.id));

        await logAudit({
          userId: req.user!.id,
          memberId: member.id,
          action: AuditActions.VERIFY_NIN,
          details: { nin: verificationResult.data.nin },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: "success",
        });

        return res.json({
          success: true,
          data: { message: "NIN verified successfully", member }
        });
      } else {
        const newAttempts = attempts + 1;
        await db.update(schema.members)
          .set({ ninVerificationAttempts: newAttempts })
          .where(eq(schema.members.id, member.id));

        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts;
        return res.status(400).json({
          success: false,
          error: `NIN verification failed. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        });
      }
    } catch (verifyError: any) {
      const newAttempts = attempts + 1;
      await db.update(schema.members)
        .set({ ninVerificationAttempts: newAttempts })
        .where(eq(schema.members.id, member.id));

      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts;
      return res.status(400).json({
        success: false,
        error: verifyError.message || "NIN verification failed",
        remainingAttempts
      });
    }
  } catch (error) {
    console.error("NIN verification error:", error);
    res.status(500).json({ success: false, error: "Failed to verify NIN" });
  }
});

// Verify NIN for profile
router.post("/api/profile/verify-nin", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nin, dateOfBirth } = req.body;

    if (!nin || !dateOfBirth) {
      return res.status(400).json({ success: false, error: "NIN and date of birth are required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
      with: { user: true }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const attempts = member.ninVerificationAttempts || 0;
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: `Maximum verification attempts (${MAX_VERIFICATION_ATTEMPTS}) exceeded`
      });
    }

    if (!validateNINFormat(nin)) {
      return res.status(400).json({ success: false, error: "Invalid NIN format" });
    }

    try {
      const verificationResult = await ninService.verifyNIN({
        nin,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        dateOfBirth
      });

      if (verificationResult.success && verificationResult.data?.verified) {
        await db.update(schema.members)
          .set({
            nin: verificationResult.data.nin,
            ninVerified: true,
            ninVerifiedAt: new Date(),
            ninVerificationAttempts: attempts + 1,
            status: "active"
          })
          .where(eq(schema.members.id, member.id));

        return res.json({
          success: true,
          data: { message: "NIN verified successfully" }
        });
      } else {
        const newAttempts = attempts + 1;
        await db.update(schema.members)
          .set({ ninVerificationAttempts: newAttempts })
          .where(eq(schema.members.id, member.id));

        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - newAttempts;
        return res.status(400).json({
          success: false,
          error: "NIN verification failed",
          remainingAttempts
        });
      }
    } catch (verifyError: any) {
      const newAttempts = attempts + 1;
      await db.update(schema.members)
        .set({ ninVerificationAttempts: newAttempts })
        .where(eq(schema.members.id, member.id));

      return res.status(400).json({
        success: false,
        error: verifyError.message || "NIN verification failed"
      });
    }
  } catch (error) {
    console.error("NIN verification error:", error);
    res.status(500).json({ success: false, error: "Failed to verify NIN" });
  }
});

// Get member QR code
router.get("/api/members/:id/qr-code", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      memberId: member.id,
      memberCode: member.memberId,
      timestamp: new Date().toISOString()
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      data: { qrCode: qrCodeDataUrl }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate QR code" });
  }
});

// Get member ID card
router.get("/api/members/:id/id-card", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id),
      with: { user: true, ward: { with: { lga: { with: { state: true } } } } }
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const idCards = await db.query.memberIdCards.findMany({
      where: and(
        eq(schema.memberIdCards.memberId, member.id),
        sql`${schema.memberIdCards.revokedAt} IS NULL`
      )
    });

    if (idCards.length === 0) {
      return res.status(404).json({ success: false, error: "No active ID card found" });
    }

    const idCard = idCards[0];
    const token = generateIdCardToken ? generateIdCardToken(member.id, idCard.signatureNonce) : "";

    res.json({
      success: true,
      data: {
        member: {
          id: member.id,
          memberId: member.memberId,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          phone: member.user.phone,
          email: member.user.email,
          ward: member.ward,
          status: member.status
        },
        idCard,
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch ID card" });
  }
});

// Regenerate ID card
router.post("/api/members/:id/id-card/regenerate", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
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

    const token = generateIdCardToken ? generateIdCardToken(member.id, idCard.signatureNonce) : "";

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

export default router;
