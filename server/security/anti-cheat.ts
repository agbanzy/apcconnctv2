import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { logAudit, AuditActions } from "../utils/audit-logger";
import { generateFingerprint } from "./crypto-tokens";

/**
 * Rate limit configuration for different action types
 */
export const RATE_LIMITS = {
  quiz: { maxAttempts: 3, windowMinutes: 60 }, // 3 quizzes per hour
  task: { maxAttempts: 10, windowMinutes: 60 }, // 10 tasks per hour
  vote: { maxAttempts: 5, windowMinutes: 60 }, // 5 votes per hour
  event: { maxAttempts: 3, windowMinutes: 1440 }, // 3 events per day
} as const;

/**
 * Fraud detection thresholds
 */
export const FRAUD_THRESHOLDS = {
  MIN_QUIZ_TIME: 5, // Minimum 5 seconds to complete a quiz
  MAX_POINTS_PER_HOUR: 100, // Maximum 100 points per hour
  MAX_ACTIONS_FROM_SAME_IP: 20, // Max 20 actions from same IP in an hour
  SUSPICIOUS_TIMING_THRESHOLD: 2, // Completing actions within 2 seconds
};

export type ActionType = "quiz" | "task" | "vote" | "event";

/**
 * Anti-Cheat Service
 * 
 * Note: Rate limiting is handled by express-rate-limit middleware at the route level.
 * This service focuses on fraud detection and duplicate prevention.
 */
export class AntiCheatService {
  /**
   * Check if member is suspended
   */
  async isSuspended(memberId: string): Promise<boolean> {
    const suspension = await db.query.accountSuspensions.findFirst({
      where: and(
        eq(schema.accountSuspensions.memberId, memberId),
        eq(schema.accountSuspensions.isActive, true)
      ),
    });

    if (!suspension) return false;

    // Check if suspension has expired
    if (suspension.expiresAt && new Date() > suspension.expiresAt) {
      // Deactivate expired suspension
      await db
        .update(schema.accountSuspensions)
        .set({ isActive: false })
        .where(eq(schema.accountSuspensions.id, suspension.id));
      return false;
    }

    return true;
  }

  /**
   * Verify that a quiz attempt hasn't already been made
   */
  async verifyUniqueQuizAttempt(
    memberId: string,
    quizId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const existing = await db.query.quizAttempts.findFirst({
      where: and(
        eq(schema.quizAttempts.memberId, memberId),
        eq(schema.quizAttempts.quizId, quizId)
      ),
    });

    if (existing) {
      return { valid: false, error: "Quiz already attempted" };
    }

    return { valid: true };
  }

  /**
   * Verify that a task completion hasn't already been submitted
   */
  async verifyUniqueTaskCompletion(
    memberId: string,
    taskId: string,
    taskType: string
  ): Promise<{ valid: boolean; error?: string }> {
    const existing = await db.query.taskCompletions.findFirst({
      where: and(
        eq(schema.taskCompletions.memberId, memberId),
        eq(schema.taskCompletions.taskId, taskId),
        eq(schema.taskCompletions.taskType, taskType)
      ),
    });

    if (existing) {
      return { valid: false, error: "Task already completed" };
    }

    return { valid: true };
  }

  /**
   * Verify that a proof URL hasn't been used before
   */
  async verifyUniqueProof(
    proofUrl: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!proofUrl) return { valid: true };

    const existing = await db.query.taskCompletions.findFirst({
      where: eq(schema.taskCompletions.proofUrl, proofUrl),
    });

    if (existing) {
      return { valid: false, error: "This proof has already been submitted" };
    }

    return { valid: true };
  }

  /**
   * Verify that a campaign vote hasn't already been cast
   */
  async verifyUniqueCampaignVote(
    memberId: string,
    campaignId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const existing = await db.query.campaignVotes.findFirst({
      where: and(
        eq(schema.campaignVotes.memberId, memberId),
        eq(schema.campaignVotes.campaignId, campaignId)
      ),
    });

    if (existing) {
      return { valid: false, error: "Already voted on this campaign" };
    }

    // Check for recent vote (cooldown period - 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentVote = await db.query.campaignVotes.findFirst({
      where: and(
        eq(schema.campaignVotes.memberId, memberId),
        gte(schema.campaignVotes.votedAt, oneMinuteAgo)
      ),
    });

    if (recentVote) {
      return { valid: false, error: "Please wait before voting again" };
    }

    return { valid: true };
  }

  /**
   * Verify that event attendance hasn't already been recorded
   */
  async verifyUniqueEventAttendance(
    memberId: string,
    eventId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const existing = await db.query.eventAttendance.findFirst({
      where: and(
        eq(schema.eventAttendance.memberId, memberId),
        eq(schema.eventAttendance.eventId, eventId)
      ),
    });

    if (existing) {
      return { valid: false, error: "Already checked in to this event" };
    }

    return { valid: true };
  }

  /**
   * Validate quiz completion time
   */
  validateQuizTiming(completionTimeSeconds: number): {
    valid: boolean;
    error?: string;
  } {
    if (completionTimeSeconds < FRAUD_THRESHOLDS.MIN_QUIZ_TIME) {
      return {
        valid: false,
        error: "Quiz completed too quickly - suspicious activity detected",
      };
    }

    return { valid: true };
  }

  /**
   * Validate event check-in time window
   */
  async validateEventTiming(eventId: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, eventId),
    });

    if (!event) {
      return { valid: false, error: "Event not found" };
    }

    const now = new Date();
    const eventDate = new Date(event.date);
    const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
    const twoHoursAfter = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    if (now < oneHourBefore) {
      return { valid: false, error: "Check-in not yet available" };
    }

    if (now > twoHoursAfter) {
      return { valid: false, error: "Check-in window has closed" };
    }

    return { valid: true };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Validate event location (if coordinates provided)
   */
  validateEventLocation(
    eventCoordinates: { lat: number; lng: number } | null,
    userCoordinates: { lat: number; lng: number } | null
  ): { valid: boolean; error?: string } {
    // If no coordinates provided, skip location validation
    if (!eventCoordinates || !userCoordinates) {
      return { valid: true };
    }

    const distance = this.calculateDistance(
      eventCoordinates.lat,
      eventCoordinates.lng,
      userCoordinates.lat,
      userCoordinates.lng
    );

    // Allow check-in within 500 meters of event location
    if (distance > 500) {
      return {
        valid: false,
        error: "You must be at the event location to check in",
      };
    }

    return { valid: true };
  }

  /**
   * Detect fraud patterns based on recent activity
   */
  async detectFraudPatterns(memberId: string, ipAddress: string): Promise<{
    suspicious: boolean;
    reasons: string[];
    score: number;
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check points earned in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentPoints = await db.query.userPoints.findMany({
      where: and(
        eq(schema.userPoints.memberId, memberId),
        gte(schema.userPoints.createdAt, oneHourAgo)
      ),
    });

    const pointsThisHour = recentPoints.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    if (pointsThisHour > FRAUD_THRESHOLDS.MAX_POINTS_PER_HOUR) {
      reasons.push("Excessive points earned in short time");
      score += 30;
    }

    // Check actions from same IP
    const recentAuditLogs = await db.query.auditLogs.findMany({
      where: and(
        eq(schema.auditLogs.ipAddress, ipAddress),
        gte(schema.auditLogs.createdAt, oneHourAgo)
      ),
      limit: 100,
    });

    if (recentAuditLogs.length > FRAUD_THRESHOLDS.MAX_ACTIONS_FROM_SAME_IP) {
      reasons.push("Too many actions from same IP address");
      score += 25;
    }

    // Check for suspiciously fast actions
    const recentActions = await db.query.auditLogs.findMany({
      where: and(
        eq(schema.auditLogs.memberId, memberId),
        gte(schema.auditLogs.createdAt, oneHourAgo)
      ),
      orderBy: desc(schema.auditLogs.createdAt),
      limit: 10,
    });

    for (let i = 0; i < recentActions.length - 1; i++) {
      const timeDiff =
        new Date(recentActions[i].createdAt!).getTime() -
        new Date(recentActions[i + 1].createdAt!).getTime();
      if (timeDiff < FRAUD_THRESHOLDS.SUSPICIOUS_TIMING_THRESHOLD * 1000) {
        reasons.push("Actions completed too quickly");
        score += 20;
        break;
      }
    }

    // Check for existing fraud detection logs
    const existingFraudLogs = await db.query.fraudDetectionLogs.findMany({
      where: and(
        eq(schema.fraudDetectionLogs.memberId, memberId),
        gte(schema.fraudDetectionLogs.createdAt, oneHourAgo)
      ),
    });

    if (existingFraudLogs.length > 0) {
      reasons.push("Previous suspicious activity detected");
      score += 15;
    }

    return {
      suspicious: score >= 50, // Threshold for suspicious activity
      reasons,
      score,
    };
  }

  /**
   * Log fraud detection event
   */
  async logFraudDetection(
    memberId: string,
    actionType: ActionType,
    reason: string,
    severity: "low" | "medium" | "high" | "critical",
    blocked: boolean,
    metadata: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const fingerprint = generateFingerprint(ipAddress, userAgent);

    await db.insert(schema.fraudDetectionLogs).values({
      memberId,
      actionType,
      detectionReason: reason,
      severity,
      blocked,
      metadata,
      ipAddress,
      userAgent,
      fingerprint,
    });
  }

  /**
   * Suspend account for fraud
   */
  async suspendAccount(
    memberId: string,
    reason: string,
    suspendedBy: string,
    durationDays?: number
  ): Promise<void> {
    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(schema.accountSuspensions).values({
      memberId,
      reason,
      suspendedBy,
      expiresAt,
      isActive: true,
      notes: "Automatic suspension due to fraud detection",
    });

    await logAudit({
      action: AuditActions.ADMIN_ACTION,
      resourceType: "member",
      resourceId: memberId,
      details: { reason, suspendedBy, durationDays },
      status: "success",
    });
  }

  /**
   * Calculate member's total fraud score
   */
  async calculateFraudScore(memberId: string): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const fraudLogs = await db.query.fraudDetectionLogs.findMany({
      where: and(
        eq(schema.fraudDetectionLogs.memberId, memberId),
        gte(schema.fraudDetectionLogs.createdAt, oneWeekAgo)
      ),
    });

    const severityScores = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 100,
    };

    const score = fraudLogs.reduce((total, log) => {
      return total + (severityScores[log.severity as keyof typeof severityScores] || 0);
    }, 0);

    return score;
  }
}

// Export singleton instance
export const antiCheatService = new AntiCheatService();
