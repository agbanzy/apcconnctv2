import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, gte, lte, ilike } from "drizzle-orm";
import { emailService } from "../email-service";
import { logAudit, AuditActions } from "../utils/audit-logger";
import { seedAdminBoundaries } from "../seed-admin-boundaries";

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

// Get conversion settings
router.get("/api/admin/conversion-settings", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.query.pointConversionSettings.findMany();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch conversion settings" });
  }
});

// Update conversion settings
router.post("/api/admin/conversion-settings", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { pointValue, currency } = req.body;

    if (pointValue === undefined || pointValue < 0) {
      return res.status(400).json({ success: false, error: "Invalid point value" });
    }

    const existing = await db.query.pointConversionSettings.findFirst();

    if (existing) {
      const [updated] = await db.update(schema.pointConversionSettings)
        .set({
          pointValue,
          currency: currency || existing.currency
        })
        .where(eq(schema.pointConversionSettings.id, existing.id))
        .returning();

      res.json({ success: true, data: updated });
    } else {
      const [created] = await db.insert(schema.pointConversionSettings).values({
        pointValue,
        currency: currency || "NGN"
      }).returning();

      res.json({ success: true, data: created });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update conversion settings" });
  }
});

// Get all dues
router.get("/api/admin/dues/all", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = "50", offset = "0" } = req.query;

    let whereConditions: any = undefined;
    if (status) {
      whereConditions = eq(schema.membershipDues.paymentStatus, status as string);
    }

    const dues = await db.query.membershipDues.findMany({
      where: whereConditions,
      orderBy: desc(schema.membershipDues.dueDate),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        member: {
          with: { user: true }
        }
      }
    });

    res.json({
      success: true,
      data: dues,
      count: dues.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch dues" });
  }
});

// Generate membership dues
router.post("/api/admin/dues/generate", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, amount, dueDate } = req.body;

    if (!memberId || !amount) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, memberId)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const [dues] = await db.insert(schema.membershipDues).values({
      memberId,
      amount,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentStatus: "pending"
    }).returning();

    await logAudit({
      userId: req.user!.id,
      memberId,
      action: AuditActions.GENERATE_DUES,
      resourceType: "dues",
      resourceId: dues.id,
      details: { amount, dueDate: dues.dueDate },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.status(201).json({ success: true, data: dues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to generate dues" });
  }
});

// Check overdue dues
router.post("/api/admin/dues/check-overdue", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const overdueDues = await db.query.membershipDues.findMany({
      where: and(
        eq(schema.membershipDues.paymentStatus, "pending"),
        lte(schema.membershipDues.dueDate, now)
      ),
      with: {
        member: {
          with: { user: true }
        }
      }
    });

    // Mark as overdue and optionally suspend members
    for (const due of overdueDues) {
      await db.update(schema.membershipDues)
        .set({ paymentStatus: "failed" })
        .where(eq(schema.membershipDues.id, due.id));
    }

    res.json({
      success: true,
      data: {
        overdueCount: overdueDues.length,
        dues: overdueDues
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to check overdue dues" });
  }
});

// Seed admin boundaries
router.post("/api/admin/seed-boundaries", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    await seedAdminBoundaries();

    res.json({
      success: true,
      data: { message: "Admin boundaries seeded successfully" }
    });
  } catch (error: any) {
    console.error("Seed boundaries error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to seed boundaries"
    });
  }
});

// Suspend member (admin version)
router.post("/api/admin/members/:id/suspend", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
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

// Activate member (admin version)
router.post("/api/admin/members/:id/activate", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
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

// Delete member (admin version)
router.post("/api/admin/members/:id/delete", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
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

// Restore member (admin version)
router.post("/api/admin/members/:id/restore", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
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

// Get member status history
router.get("/api/admin/members/:id/status-history", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.query.auditLogs.findMany({
      where: and(
        eq(schema.auditLogs.memberId, req.params.id),
        ilike(schema.auditLogs.action, "%member%")
      ),
      orderBy: desc(schema.auditLogs.createdAt),
      limit: 50
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch status history" });
  }
});

// Get member notes
router.get("/api/admin/members/:id/notes", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const notes = await db.query.memberNotes.findMany({
      where: eq(schema.memberNotes.memberId, req.params.id),
      with: { author: true },
      orderBy: desc(schema.memberNotes.createdAt)
    });

    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch notes" });
  }
});

// Add note to member
router.post("/api/admin/members/:id/notes", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, error: "Note text is required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, req.params.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const adminMember = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    const [newNote] = await db.insert(schema.memberNotes).values({
      memberId: req.params.id,
      authorId: req.user!.id,
      note,
      visibility: "admin_only"
    }).returning();

    res.status(201).json({ success: true, data: newNote });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add note" });
  }
});

// Update member note
router.patch("/api/admin/members/:memberId/notes/:noteId", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, error: "Note text is required" });
    }

    const existingNote = await db.query.memberNotes.findFirst({
      where: eq(schema.memberNotes.id, req.params.noteId)
    });

    if (!existingNote) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    const [updated] = await db.update(schema.memberNotes)
      .set({ note })
      .where(eq(schema.memberNotes.id, req.params.noteId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update note" });
  }
});

// Delete member note
router.delete("/api/admin/members/:memberId/notes/:noteId", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const note = await db.query.memberNotes.findFirst({
      where: eq(schema.memberNotes.id, req.params.noteId)
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    await db.delete(schema.memberNotes).where(eq(schema.memberNotes.id, req.params.noteId));

    res.json({ success: true, data: { message: "Note deleted" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete note" });
  }
});

// Get audit logs
router.get("/api/admin/audit-logs", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const { action, memberId, limit = "50", offset = "0" } = req.query;

    let whereConditions: any = undefined;
    if (action) {
      whereConditions = eq(schema.auditLogs.action, action as string);
    }

    const logs = await db.query.auditLogs.findMany({
      where: whereConditions,
      orderBy: desc(schema.auditLogs.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// Export audit logs
router.get("/api/admin/audit-logs/export", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.query.auditLogs.findMany({
      orderBy: desc(schema.auditLogs.createdAt),
      limit: 10000
    });

    // Convert to CSV
    const headers = ["ID", "User ID", "Member ID", "Action", "Status", "Created At"];
    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.memberId || "",
      log.action,
      log.status,
      log.createdAt?.toISOString() || ""
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to export logs" });
  }
});

export default router;
