import { db } from "../db";
import * as schema from "@shared/schema";

export const AuditActions = {
  LOGIN: "login",
  LOGOUT: "logout",
  REGISTER: "register",
  VOTE: "vote",
  PAYMENT: "payment",
  PAYMENT_FAILED: "payment_failed",
  ADMIN_ACTION: "admin_action",
  ADMIN_SEED_BOUNDARIES: "admin_seed_boundaries",
  NIN_VERIFICATION: "nin_verification",
  MEMBER_STATUS_CHANGE: "member_status_change",
  ELECTION_CREATED: "election_created",
  ELECTION_UPDATED: "election_updated",
  TASK_COMPLETED: "task_completed",
  BADGE_EARNED: "badge_earned",
  POINTS_AWARDED: "points_awarded",
  DONATION: "donation",
  INCIDENT_REPORTED: "incident_reported",
  CAMPAIGN_VOTE: "campaign_vote",
  IDEA_SUBMITTED: "idea_submitted",
  PUSH_SUBSCRIPTION: "push_subscription",
} as const;

export interface AuditLogData {
  userId?: string;
  memberId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
}

export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      userId: data.userId || null,
      memberId: data.memberId || null,
      action: data.action,
      resourceType: data.resourceType || null,
      resourceId: data.resourceId || null,
      details: data.details || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      status: data.status,
    });
  } catch (error) {
    console.error("[Audit Logger] Failed to log audit:", error);
  }
}
