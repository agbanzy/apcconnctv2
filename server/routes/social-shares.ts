import { Router, Request, Response } from "express";
import { z } from "zod";
import { socialSharingService } from "../services/social-sharing";
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

const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  next();
};

const recordShareSchema = z.object({
  platform: z.enum(["facebook", "twitter", "instagram", "whatsapp"]),
  contentType: z.enum(["news", "event", "campaign", "election"]),
  contentId: z.string(),
  shareUrl: z.string().url().optional(),
});

const verifyShareSchema = z.object({
  verificationMethod: z.enum(["screenshot", "api", "manual"]),
  proofUrl: z.string().url().optional(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const shareData = recordShareSchema.parse(req.body);

    const result = await socialSharingService.recordShare({
      memberId: member.id,
      ...shareData,
    });

    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Error recording share:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to record share",
    });
  }
});

router.post("/:shareId/verify", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { shareId } = req.params;
    const verifyData = verifyShareSchema.parse(req.body);

    const result = await socialSharingService.verifyShare({
      shareId,
      verifiedBy: req.user!.id,
      ...verifyData,
    });

    return res.json({
      success: true,
      data: result,
      message: result.approved
        ? `Share verified! ${result.pointsAwarded} points awarded.`
        : "Share verification rejected.",
    });
  } catch (error: any) {
    console.error("Error verifying share:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to verify share",
    });
  }
});

router.get("/my-shares", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const shares = await socialSharingService.getMyShares(member.id);

    return res.json({
      success: true,
      data: shares,
    });
  } catch (error: any) {
    console.error("Error fetching shares:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch shares",
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

    const stats = await socialSharingService.getShareStats(member.id);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching share stats:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch stats",
    });
  }
});

export default router;
