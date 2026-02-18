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
  ADMIN_UPDATE: "admin_update",
  ADMIN_SEED_BOUNDARIES: "admin_seed_boundaries",
  NIN_VERIFICATION: "nin_verification",
  MEMBER_STATUS_CHANGE: "member_status_change",
  ELECTION_CREATED: "election_created",
  ELECTION_UPDATED: "election_updated",
  TASK_COMPLETED: "task_completed",
  BADGE_EARNED: "badge_earned",
  POINTS_AWARDED: "points_awarded",
  REWARD_REDEEM: "reward_redeem",
  DONATION: "donation",
  INCIDENT_REPORTED: "incident_reported",
  CAMPAIGN_VOTE: "campaign_vote",
  IDEA_SUBMITTED: "idea_submitted",
  PUSH_SUBSCRIPTION: "push_subscription",
  SUSPEND_MEMBER: "suspend_member",
  ACTIVATE_MEMBER: "activate_member",
  DELETE_MEMBER: "delete_member",
  RESTORE_MEMBER: "restore_member",
  RESET_PASSWORD: "reset_password",
  VERIFY_NIN: "nin_verification",
  GENERATE_DUES: "generate_dues",
  CREATE_ELECTION: "election_created",
  UPDATE_ELECTION: "election_updated",
  ADD_CANDIDATE: "add_candidate",
  CAST_VOTE: "vote",
  CREATE_EVENT: "create_event",
  UPDATE_EVENT: "update_event",
  DELETE_EVENT: "delete_event",
  RSVP_EVENT: "rsvp_event",
  EVENT_CHECKIN: "event_checkin",
  CREATE_NEWS: "create_news",
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
  fingerprint?: string;
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
      fingerprint: data.fingerprint || null,
      status: data.status,
    });
  } catch (error) {
    console.error("[Audit Logger] Failed to log audit:", error);
  }
}
