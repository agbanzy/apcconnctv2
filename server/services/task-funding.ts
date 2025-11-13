import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { pointLedgerService } from "./point-ledger";

export interface CreateUserTaskParams {
  creatorMemberId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  skills: string[];
  pointsPerCompletion: number;
  maxCompletions?: number;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  difficulty: "Easy" | "Medium" | "Hard";
  autoApprove?: boolean;
  requiresProof?: boolean;
  fundingPoints: number;
}

export interface CompleteTaskParams {
  taskId: string;
  volunteerId: string;
  verifierId: string;
  approved: boolean;
  rejectionReason?: string;
}

export class TaskFundingService {
  async createUserTask(params: CreateUserTaskParams) {
    const {
      creatorMemberId,
      title,
      description,
      category,
      location,
      skills,
      pointsPerCompletion,
      maxCompletions = 1,
      startDate,
      endDate,
      deadline,
      difficulty,
      autoApprove = false,
      requiresProof = true,
      fundingPoints,
    } = params;

    if (fundingPoints <= 0) {
      throw new Error("Funding points must be greater than 0");
    }

    if (pointsPerCompletion <= 0) {
      throw new Error("Points per completion must be greater than 0");
    }

    const totalPointsNeeded = pointsPerCompletion * maxCompletions;
    if (fundingPoints < totalPointsNeeded) {
      throw new Error(
        `Insufficient funding. Need ${totalPointsNeeded} points (${pointsPerCompletion} × ${maxCompletions}), but only ${fundingPoints} provided`
      );
    }

    return await db.transaction(async (tx) => {
      const member = await tx.query.members.findFirst({
        where: eq(schema.members.id, creatorMemberId),
      });

      if (!member) {
        throw new Error("Member not found");
      }

      const currentBalance = await pointLedgerService.getBalance(creatorMemberId, tx);
      if (currentBalance < fundingPoints) {
        throw new Error(
          `Insufficient points balance. Have ${currentBalance}, need ${fundingPoints}`
        );
      }

      const [task] = await tx
        .insert(schema.volunteerTasks)
        .values({
          title,
          description,
          category,
          location,
          skills,
          points: pointsPerCompletion,
          startDate,
          endDate,
          deadline,
          difficulty,
          maxVolunteers: maxCompletions,
          currentVolunteers: 0,
          creatorId: creatorMemberId,
          isUserCreated: true,
          fundingStatus: "funded",
          autoApprove,
          requiresProof,
          status: "open",
        })
        .returning();

      await tx.insert(schema.volunteerTaskFunding).values({
        taskId: task.id,
        funderId: creatorMemberId,
        totalPointsLocked: fundingPoints,
        pointsPerCompletion,
        maxCompletions,
        completionsCount: 0,
        pointsDistributed: 0,
        status: "locked",
      });

      await pointLedgerService.deductPoints({
        memberId: creatorMemberId,
        points: fundingPoints,
        transactionType: "user_task_fund",
        source: "user_task_escrow",
        referenceType: "user_task",
        referenceId: task.id,
        metadata: {
          taskTitle: title,
          totalLocked: fundingPoints,
          pointsPerCompletion,
          maxCompletions,
        },
      }, tx);

      return { task, fundingAmount: fundingPoints };
    });
  }

  async fundTask(taskId: string, funderMemberId: string, points: number) {
    if (points <= 0) {
      throw new Error("Funding points must be greater than 0");
    }

    return await db.transaction(async (tx) => {
      const task = await tx.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, taskId),
      });

      if (!task) {
        throw new Error("Task not found");
      }

      if (!task.isUserCreated) {
        throw new Error("Can only fund user-created tasks");
      }

      if (task.creatorId !== funderMemberId) {
        throw new Error("Only the task creator can fund their task");
      }

      const existingFunding = await tx.query.volunteerTaskFunding.findFirst({
        where: eq(schema.volunteerTaskFunding.taskId, taskId),
      });

      if (existingFunding) {
        throw new Error("Task already has funding");
      }

      const currentBalance = await pointLedgerService.getBalance(funderMemberId, tx);
      if (currentBalance < points) {
        throw new Error(
          `Insufficient points balance. Have ${currentBalance}, need ${points}`
        );
      }

      const maxCompletions = task.maxVolunteers || 1;
      const pointsPerCompletion = task.points;

      await tx.insert(schema.volunteerTaskFunding).values({
        taskId,
        funderId: funderMemberId,
        totalPointsLocked: points,
        pointsPerCompletion,
        maxCompletions,
        completionsCount: 0,
        pointsDistributed: 0,
        status: "locked",
      });

      await tx
        .update(schema.volunteerTasks)
        .set({ fundingStatus: "funded" })
        .where(eq(schema.volunteerTasks.id, taskId));

      await pointLedgerService.deductPoints({
        memberId: funderMemberId,
        points,
        transactionType: "user_task_fund",
        source: "user_task_escrow",
        referenceType: "user_task",
        referenceId: taskId,
        metadata: {
          taskTitle: task.title,
          totalLocked: points,
          pointsPerCompletion,
          maxCompletions,
        },
      }, tx);

      return { taskId, fundingAmount: points };
    });
  }

  async completeTaskAndPayout(params: CompleteTaskParams) {
    const { taskId, volunteerId, verifierId, approved, rejectionReason } = params;

    return await db.transaction(async (tx) => {
      const task = await tx.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, taskId),
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const funding = await tx.query.volunteerTaskFunding.findFirst({
        where: eq(schema.volunteerTaskFunding.taskId, taskId),
      });

      if (!funding) {
        throw new Error("Task has no funding");
      }

      if (funding.status !== "locked") {
        throw new Error(`Task funding status is ${funding.status}, expected 'locked'`);
      }

      const volunteer = await tx.query.members.findFirst({
        where: eq(schema.members.id, volunteerId),
      });

      if (!volunteer) {
        throw new Error("Volunteer not found");
      }

      if (!approved) {
        const [completion] = await tx
          .insert(schema.taskCompletions)
          .values({
            taskId,
            taskType: "volunteer",
            memberId: volunteerId,
            status: "rejected",
            pointsEarned: 0,
            verified: true,
            completedAt: new Date(),
          })
          .returning();

        return {
          completion,
          pointsAwarded: 0,
          approved: false,
          rejectionReason: rejectionReason || "Task completion not approved",
        };
      }

      if (funding.completionsCount >= funding.maxCompletions) {
        throw new Error("Maximum completions reached for this task");
      }

      const pointsToAward = funding.pointsPerCompletion;

      if (funding.pointsDistributed + pointsToAward > funding.totalPointsLocked) {
        throw new Error("Insufficient points in escrow");
      }

      const [completion] = await tx
        .insert(schema.taskCompletions)
        .values({
          taskId,
          taskType: "volunteer",
          memberId: volunteerId,
          status: "approved",
          pointsEarned: pointsToAward,
          verified: true,
          completedAt: new Date(),
        })
        .returning();

      await pointLedgerService.addPoints({
        memberId: volunteerId,
        points: pointsToAward,
        transactionType: "user_task_payout",
        source: "user_task_completion",
        referenceType: "user_task",
        referenceId: taskId,
        metadata: {
          taskTitle: task.title,
          completionId: completion.id,
          verifierId,
        },
      }, tx);

      const newCompletionsCount = funding.completionsCount + 1;
      const newPointsDistributed = funding.pointsDistributed + pointsToAward;

      await tx
        .update(schema.volunteerTaskFunding)
        .set({
          completionsCount: newCompletionsCount,
          pointsDistributed: newPointsDistributed,
          status: newCompletionsCount >= funding.maxCompletions ? "completed" : "distributing",
          completedAt:
            newCompletionsCount >= funding.maxCompletions ? new Date() : undefined,
        })
        .where(eq(schema.volunteerTaskFunding.id, funding.id));

      await tx
        .update(schema.volunteerTasks)
        .set({
          currentVolunteers: newCompletionsCount,
          status: newCompletionsCount >= funding.maxCompletions ? "completed" : "in-progress",
          fundingStatus:
            newCompletionsCount >= funding.maxCompletions ? "completed" : "distributing",
        })
        .where(eq(schema.volunteerTasks.id, taskId));

      return {
        completion,
        pointsAwarded: pointsToAward,
        approved: true,
        remainingCompletions: funding.maxCompletions - newCompletionsCount,
      };
    });
  }

  async cancelTaskAndRefund(taskId: string, cancellerId: string) {
    return await db.transaction(async (tx) => {
      const task = await tx.query.volunteerTasks.findFirst({
        where: eq(schema.volunteerTasks.id, taskId),
      });

      if (!task) {
        throw new Error("Task not found");
      }

      if (task.creatorId !== cancellerId) {
        throw new Error("Only the task creator can cancel this task");
      }

      const funding = await tx.query.volunteerTaskFunding.findFirst({
        where: eq(schema.volunteerTaskFunding.taskId, taskId),
      });

      if (!funding) {
        throw new Error("Task has no funding");
      }

      if (funding.status === "refunded") {
        throw new Error("Task funding already refunded");
      }

      if (funding.status === "completed") {
        throw new Error("Cannot cancel completed task");
      }

      const refundAmount = funding.totalPointsLocked - funding.pointsDistributed;

      if (refundAmount > 0) {
        await pointLedgerService.addPoints({
          memberId: funding.funderId,
          points: refundAmount,
          transactionType: "user_task_refund",
          source: "user_task_cancellation",
          referenceType: "user_task",
          referenceId: taskId,
          metadata: {
            taskTitle: task.title,
            originalLocked: funding.totalPointsLocked,
            pointsDistributed: funding.pointsDistributed,
            refundAmount,
          },
        }, tx);
      }

      await tx
        .update(schema.volunteerTaskFunding)
        .set({
          status: "refunded",
          completedAt: new Date(),
        })
        .where(eq(schema.volunteerTaskFunding.id, funding.id));

      await tx
        .update(schema.volunteerTasks)
        .set({
          status: "closed",
          fundingStatus: "refunded",
        })
        .where(eq(schema.volunteerTasks.id, taskId));

      return {
        taskId,
        refundAmount,
        pointsDistributed: funding.pointsDistributed,
        message: `Task cancelled. ${refundAmount} points refunded to creator.`,
      };
    });
  }

  async getMyCreatedTasks(creatorMemberId: string) {
    const tasks = await db
      .select({
        task: schema.volunteerTasks,
        funding: schema.volunteerTaskFunding,
      })
      .from(schema.volunteerTasks)
      .leftJoin(
        schema.volunteerTaskFunding,
        eq(schema.volunteerTasks.id, schema.volunteerTaskFunding.taskId)
      )
      .where(
        and(
          eq(schema.volunteerTasks.creatorId, creatorMemberId),
          eq(schema.volunteerTasks.isUserCreated, true)
        )
      )
      .orderBy(desc(schema.volunteerTasks.createdAt));

    return tasks;
  }

  async getAvailableTasks(limit = 20, offset = 0) {
    const tasks = await db
      .select({
        task: schema.volunteerTasks,
        funding: schema.volunteerTaskFunding,
      })
      .from(schema.volunteerTasks)
      .leftJoin(
        schema.volunteerTaskFunding,
        eq(schema.volunteerTasks.id, schema.volunteerTaskFunding.taskId)
      )
      .where(
        and(
          eq(schema.volunteerTasks.isUserCreated, true),
          eq(schema.volunteerTasks.status, "open"),
          eq(schema.volunteerTasks.fundingStatus, "funded")
        )
      )
      .orderBy(desc(schema.volunteerTasks.createdAt))
      .limit(limit)
      .offset(offset);

    return tasks;
  }
}

export const taskFundingService = new TaskFundingService();
