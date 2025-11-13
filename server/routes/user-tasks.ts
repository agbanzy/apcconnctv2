import { Router, Request, Response } from "express";
import { z } from "zod";
import { taskFundingService } from "../services/task-funding";
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

const createTaskSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20).max(2000),
  category: z.string(),
  location: z.string(),
  skills: z.array(z.string()),
  pointsPerCompletion: z.number().min(10).max(1000),
  maxCompletions: z.number().min(1).max(100).optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  deadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  autoApprove: z.boolean().optional(),
  requiresProof: z.boolean().optional(),
  fundingPoints: z.number().min(10),
});

const completeTaskSchema = z.object({
  volunteerId: z.string(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

router.post("/create-and-fund", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const taskData = createTaskSchema.parse(req.body);

    const result = await taskFundingService.createUserTask({
      creatorMemberId: member.id,
      ...taskData,
    });

    return res.json({
      success: true,
      data: result,
      message: `Task created and funded with ${taskData.fundingPoints} points`,
    });
  } catch (error: any) {
    console.error("Error creating user task:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create task",
    });
  }
});

router.post("/:taskId/complete", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const { taskId } = req.params;
    const { volunteerId, approved, rejectionReason } = completeTaskSchema.parse(req.body);

    const task = await db.query.volunteerTasks.findFirst({
      where: eq(schema.volunteerTasks.id, taskId),
    });

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    if (task.creatorId !== member.id && req.user!.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only task creator or admin can verify completion",
      });
    }

    const result = await taskFundingService.completeTaskAndPayout({
      taskId,
      volunteerId,
      verifierId: member.id,
      approved,
      rejectionReason,
    });

    return res.json({
      success: true,
      data: result,
      message: approved
        ? `Task completion approved! ${result.pointsAwarded} points awarded.`
        : "Task completion rejected.",
    });
  } catch (error: any) {
    console.error("Error completing task:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to complete task",
    });
  }
});

router.post("/:taskId/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const { taskId } = req.params;

    const result = await taskFundingService.cancelTaskAndRefund(taskId, member.id);

    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Error canceling task:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to cancel task",
    });
  }
});

router.get("/my-created", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id),
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member profile not found" });
    }

    const tasks = await taskFundingService.getMyCreatedTasks(member.id);

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error("Error fetching created tasks:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch tasks",
    });
  }
});

router.get("/available", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const tasks = await taskFundingService.getAvailableTasks(limit, offset);

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error("Error fetching available tasks:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to fetch tasks",
    });
  }
});

export default router;
