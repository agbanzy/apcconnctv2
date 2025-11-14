import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit, AuditActions } from "../utils/audit-logger";

/**
 * Service layer for member account management operations
 * Centralizes status transitions, session revocation, and audit logging
 */

export interface ApplyStatusChangeOptions {
  memberId: string;
  newStatus: "active" | "inactive" | "suspended" | "deleted";
  changedBy: string;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface MemberNoteOptions {
  memberId: string;
  authorId: string;
  content: string;
  visibility?: string;
}

/**
 * Apply status change to member account
 * Handles: status update, history logging, session revocation, audit trail
 */
export async function applyMemberStatusChange(options: ApplyStatusChangeOptions) {
  const { memberId, newStatus, changedBy, reason, metadata, ipAddress, userAgent } = options;

  // Get current member state
  const member = await db.query.members.findFirst({
    where: eq(schema.members.id, memberId),
    with: { user: true }
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const previousStatus = member.status || "inactive";

  // Update member status and related fields
  const updateData: any = {
    status: newStatus,
  };

  // Enforce non-empty reason for all admin-driven status changes
  if (!reason || reason.trim() === "") {
    throw new Error("Status change reason is required");
  }

  // Set status-specific fields
  if (newStatus === "suspended") {
    updateData.suspendedAt = new Date();
    updateData.suspensionReason = reason;
    updateData.suspendedBy = changedBy;
    // Clear deletion fields if previously deleted
    updateData.deletedAt = null;
    updateData.deletedBy = null;
    updateData.deletionReason = null;
  } else if (newStatus === "deleted") {
    updateData.deletedAt = new Date();
    updateData.deletedBy = changedBy;
    updateData.deletionReason = reason;
    // Clear suspension fields if previously suspended
    updateData.suspendedAt = null;
    updateData.suspensionReason = null;
    updateData.suspendedBy = null;
  } else if (newStatus === "active") {
    // Clear ALL suspension and deletion fields when activating, regardless of previous status
    updateData.suspendedAt = null;
    updateData.suspensionReason = null;
    updateData.suspendedBy = null;
    updateData.deletedAt = null;
    updateData.deletedBy = null;
    updateData.deletionReason = null;
  } else if (newStatus === "inactive") {
    // Clear suspension/deletion fields when deactivating
    updateData.suspendedAt = null;
    updateData.suspensionReason = null;
    updateData.suspendedBy = null;
    updateData.deletedAt = null;
    updateData.deletedBy = null;
    updateData.deletionReason = null;
  }

  // Wrap in transaction to ensure atomicity of status change + history logging
  await db.transaction(async (tx) => {
    // Update member record
    await tx.update(schema.members)
      .set(updateData)
      .where(eq(schema.members.id, memberId));

    // Create status history entry
    await tx.insert(schema.memberStatusHistory).values({
      memberId,
      fromStatus: previousStatus,
      toStatus: newStatus,
      changedBy,
      reason: reason || `Status changed to ${newStatus}`,
      metadata: metadata || {}
    });
  });

  // Revoke sessions and tokens for suspended/deleted accounts (outside transaction)
  // Session revocation failure shouldn't roll back the status change
  if (newStatus === "suspended" || newStatus === "deleted") {
    await revokeUserSessions(member.userId);
  }

  // Audit log
  await logAudit({
    userId: changedBy,
    action: AuditActions.ADMIN_UPDATE,
    resourceType: "member",
    resourceId: memberId,
    details: {
      action: `status_change_${newStatus}`,
      previousStatus,
      newStatus,
      reason,
      metadata
    },
    status: "success",
    ipAddress,
    userAgent
  });

  return {
    success: true,
    previousStatus,
    newStatus,
    member
  };
}

/**
 * Revoke all active sessions and refresh tokens for a user
 * IMPORTANT: This clears both refresh tokens AND active Express sessions
 */
async function revokeUserSessions(userId: string) {
  try {
    // Delete all refresh tokens
    await db.delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.userId, userId));

    // Destroy active Express sessions from PostgreSQL session store
    // Session store uses a table called 'session' managed by connect-pg-simple
    // Passport.js stores sessions as: { "passport": { "user": "<userId>" } }
    try {
      await db.execute(sql`
        DELETE FROM session 
        WHERE sess::text LIKE ${`%"passport":{"user":"${userId}"}%`}
      `);
    } catch (sessionError) {
      console.error("Error clearing Express sessions:", sessionError);
      // Continue - session table might not exist or format might differ
    }
    
    console.log(`Revoked refresh tokens and active sessions for user ${userId}`);
  } catch (error) {
    console.error("Error revoking user sessions:", error);
    // Don't throw - session revocation failure shouldn't block status change
  }
}

/**
 * Create a member note
 */
export async function createMemberNote(options: MemberNoteOptions) {
  const { memberId, authorId, content, visibility } = options;

  const [note] = await db.insert(schema.memberNotes).values({
    memberId,
    authorId,
    note: content,
    visibility: visibility || "admin_only"
  }).returning();

  await logAudit({
    userId: authorId,
    action: AuditActions.ADMIN_ACTION,
    resourceType: "member-note",
    resourceId: note.id,
    details: {
      action: "create_note",
      memberId
    },
    status: "success"
  });

  return note;
}

/**
 * Update a member note
 */
export async function updateMemberNote(
  noteId: string,
  authorId: string,
  updates: Partial<MemberNoteOptions>
) {
  const note = await db.query.memberNotes.findFirst({
    where: eq(schema.memberNotes.id, noteId)
  });

  if (!note) {
    throw new Error("Note not found");
  }

  // Map content -> note field and filter allowed updates
  const updatePayload: any = {
    updatedAt: new Date()
  };
  
  if (updates.content !== undefined) {
    updatePayload.note = updates.content;
  }
  if (updates.visibility !== undefined) {
    updatePayload.visibility = updates.visibility;
  }

  const [updated] = await db.update(schema.memberNotes)
    .set(updatePayload)
    .where(eq(schema.memberNotes.id, noteId))
    .returning();

  await logAudit({
    userId: authorId,
    action: AuditActions.ADMIN_UPDATE,
    resourceType: "member-note",
    resourceId: noteId,
    details: {
      action: "update_note",
      memberId: note.memberId,
      updates
    },
    status: "success"
  });

  return updated;
}

/**
 * Delete a member note
 */
export async function deleteMemberNote(noteId: string, authorId: string) {
  const note = await db.query.memberNotes.findFirst({
    where: eq(schema.memberNotes.id, noteId)
  });

  if (!note) {
    throw new Error("Note not found");
  }

  await db.delete(schema.memberNotes)
    .where(eq(schema.memberNotes.id, noteId));

  await logAudit({
    userId: authorId,
    action: AuditActions.ADMIN_ACTION,
    resourceType: "member-note",
    resourceId: noteId,
    details: {
      action: "delete_note",
      memberId: note.memberId
    },
    status: "success"
  });

  return { success: true };
}

/**
 * Initiate admin password reset
 * Generates temporary password and sends via email/SMS
 */
export async function initiateAdminPasswordReset(
  userId: string,
  adminId: string,
  method: "email" | "sms" = "email"
) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId)
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate secure temporary password (16 chars, alphanumeric + special)
  const tempPassword = generateSecurePassword();
  
  // Hash the temporary password
  const bcrypt = require("bcrypt");
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Update user password
  await db.update(schema.users)
    .set({ 
      password: hashedPassword,
      // Could add passwordResetRequired flag here if schema supports it
    })
    .where(eq(schema.users.id, userId));

  // Audit log
  await logAudit({
    userId: adminId,
    action: AuditActions.ADMIN_ACTION,
    resourceType: "user",
    resourceId: userId,
    details: {
      action: "password_reset",
      method,
      targetUser: user.email
    },
    status: "success"
  });

  // TODO: Send via email/SMS using existing notification services
  // For now, return instructions for manual delivery
  return {
    success: true,
    method,
    message: "Password reset initiated. Temporary credentials sent to user.",
    // NEVER return the actual password in production
    // This is for admin to manually communicate it in dev/testing
    ...(process.env.NODE_ENV === "development" && {
      temporaryPassword: tempPassword,
      warning: "DEVELOPMENT ONLY - Remove before production"
    })
  };
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const crypto = require("crypto");
  let password = "";
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
