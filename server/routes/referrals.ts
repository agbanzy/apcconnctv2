import { Router, Request, Response } from "express";
import { z } from "zod";
import { referralService } from "../services/referrals";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
    role?: string | null;
  };
};

const requireAuth = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
};

const activateReferralSchema = z.object({
  referralCode: z.string().length(8),
});

router.get("/my-code", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const result = await referralService.getOrGenerateReferralCode(member.id);

    return res.json({
      success: true,
      data: result,
      message: result.isNew
        ? "New referral code generated"
        : "Retrieved existing referral code",
    });
  } catch (error: any) {
    console.error("Error getting referral code:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to get referral code",
    });
  }
});

router.post("/activate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const { referralCode } = activateReferralSchema.parse(req.body);

    const result = await referralService.activateReferral(member.id, referralCode);

    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Error activating referral:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to activate referral",
    });
  }
});

router.get("/my-referrals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const referrals = await referralService.getMyReferrals(member.id);

    return res.json({
      success: true,
      data: referrals,
    });
  } catch (error: any) {
    console.error("Error fetching referrals:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch referrals",
    });
  }
});

router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const stats = await referralService.getReferralStats(member.id);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching referral stats:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch stats",
    });
  }
});

export default router;
