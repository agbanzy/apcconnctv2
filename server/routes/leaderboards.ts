import { Router, Request, Response } from "express";
import { leaderboardService } from "../services/leaderboards";
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

router.get("/national", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await leaderboardService.getNationalLeaderboard(limit, offset);

    return res.json({
      success: true,
      data: result.leaderboard,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error fetching national leaderboard:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch leaderboard",
    });
  }
});

router.get("/state/:stateId", async (req: Request, res: Response) => {
  try {
    const { stateId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await leaderboardService.getStateLeaderboard(stateId, limit, offset);

    return res.json({
      success: true,
      data: result.leaderboard,
      total: result.total,
      stateName: result.stateName,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error fetching state leaderboard:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch leaderboard",
    });
  }
});

router.get("/my-rank", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const result = await leaderboardService.getUserRank(member.id);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching user rank:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch rank",
    });
  }
});

router.post("/snapshot", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const period = req.body.period || "all-time";

    const result = await leaderboardService.generateSnapshot(period);

    return res.json({
      success: true,
      data: result,
      message: `Generated ${result.snapshotsCreated} leaderboard snapshots`,
    });
  } catch (error: any) {
    console.error("Error generating snapshot:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to generate snapshot",
    });
  }
});

export default router;
