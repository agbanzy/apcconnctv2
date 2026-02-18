import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { eventCheckInLimiter } from "../middleware/rate-limit";
import { eventAntiCheat } from "../middleware/anti-cheat";
import { antiCheatService } from "../security/anti-cheat";
import { logAudit, AuditActions } from "../utils/audit-logger";
import { PointLedgerService } from "../services/point-ledger";

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

// Get all events
router.get("/api/events", async (req: AuthRequest, res: Response) => {
  try {
    const { status, upcomingOnly } = req.query;
    const now = new Date();

    const whereConditions: any[] = [];

    if (upcomingOnly === 'true') {
      whereConditions.push(gte(schema.events.eventDate, now));
    }

    if (status && status !== 'all') {
      whereConditions.push(eq(schema.events.status, status as string));
    }

    const events = await db.query.events.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        creator: {
          with: { user: true }
        }
      },
      orderBy: desc(schema.events.eventDate)
    });

    // Fetch RSVP counts for each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const rsvpCount = await db.query.eventRSVPs.findMany({
          where: eq(schema.eventRSVPs.eventId, event.id)
        });
        return {
          ...event,
          rsvpCount: rsvpCount.length
        };
      })
    );

    res.json({ success: true, data: eventsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

// Get single event
router.get("/api/events/:id", async (req: AuthRequest, res: Response) => {
  try {
    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, req.params.id),
      with: {
        creator: {
          with: { user: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    const attendees = await db.query.eventAttendances.findMany({
      where: eq(schema.eventAttendances.eventId, req.params.id),
      with: {
        member: {
          with: { user: true }
        }
      }
    });

    const rsvps = await db.query.eventRSVPs.findMany({
      where: eq(schema.eventRSVPs.eventId, req.params.id),
      with: {
        member: {
          with: { user: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        event,
        attendees,
        rsvps,
        rsvpCount: rsvps.length,
        attendeeCount: attendees.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch event" });
  }
});

// Create event
router.post("/api/events", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, eventDate, location, capacity, creatorId } = req.body;

    if (!title || !eventDate || !location) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const [event] = await db.insert(schema.events).values({
      title,
      description: description || "",
      eventDate: new Date(eventDate),
      location,
      capacity: capacity || 0,
      createdBy: member.id,
      status: "scheduled"
    }).returning();

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.CREATE_EVENT,
      resourceType: "event",
      resourceId: event.id,
      details: { title, location },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create event" });
  }
});

// Update event
router.patch("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, eventDate, location, capacity, status } = req.body;

    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, req.params.id)
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;

    const [updatedEvent] = await db.update(schema.events)
      .set(updateData)
      .where(eq(schema.events.id, req.params.id))
      .returning();

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    await logAudit({
      userId: req.user!.id,
      memberId: member?.id,
      action: AuditActions.UPDATE_EVENT,
      resourceType: "event",
      resourceId: event.id,
      details: { changes: updateData },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: updatedEvent });
  } catch (error: any) {
    console.error("Error updating event:", error);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
});

// Delete event
router.delete("/api/events/:id", requireAuth, requireRole("admin", "coordinator"), async (req: AuthRequest, res: Response) => {
  try {
    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, req.params.id)
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    await db.delete(schema.events).where(eq(schema.events.id, req.params.id));

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    await logAudit({
      userId: req.user!.id,
      memberId: member?.id,
      action: AuditActions.DELETE_EVENT,
      resourceType: "event",
      resourceId: event.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: { message: "Event deleted" } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to delete event" });
  }
});

// RSVP to event
router.post("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, req.params.id)
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    // Check if already RSVP'd
    const existingRSVP = await db.query.eventRSVPs.findFirst({
      where: and(
        eq(schema.eventRSVPs.eventId, req.params.id),
        eq(schema.eventRSVPs.memberId, member.id)
      )
    });

    if (existingRSVP) {
      return res.status(400).json({ success: false, error: "Already RSVP'd to this event" });
    }

    const [rsvp] = await db.insert(schema.eventRSVPs).values({
      eventId: req.params.id,
      memberId: member.id,
      status: status || "attending"
    }).returning();

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.RSVP_EVENT,
      resourceType: "event",
      resourceId: req.params.id,
      details: { rsvpStatus: rsvp.status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: rsvp });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to RSVP to event" });
  }
});

// Cancel RSVP
router.delete("/api/events/:id/rsvp", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const rsvp = await db.query.eventRSVPs.findFirst({
      where: and(
        eq(schema.eventRSVPs.eventId, req.params.id),
        eq(schema.eventRSVPs.memberId, member.id)
      )
    });

    if (!rsvp) {
      return res.status(404).json({ success: false, error: "RSVP not found" });
    }

    await db.delete(schema.eventRSVPs).where(eq(schema.eventRSVPs.id, rsvp.id));

    res.json({ success: true, data: { message: "RSVP cancelled" } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to cancel RSVP" });
  }
});

// Delete specific RSVP
router.delete("/api/events/:id/rsvp/:rsvpId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rsvp = await db.query.eventRSVPs.findFirst({
      where: eq(schema.eventRSVPs.id, req.params.rsvpId)
    });

    if (!rsvp) {
      return res.status(404).json({ success: false, error: "RSVP not found" });
    }

    await db.delete(schema.eventRSVPs).where(eq(schema.eventRSVPs.id, req.params.rsvpId));

    res.json({ success: true, data: { message: "RSVP deleted" } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to delete RSVP" });
  }
});

// Get event attendees
router.get("/api/events/:id/attendees", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const attendees = await db.query.eventAttendances.findMany({
      where: eq(schema.eventAttendances.eventId, req.params.id),
      with: {
        member: {
          with: { user: true, ward: true }
        }
      }
    });

    res.json({ success: true, data: attendees });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch attendees" });
  }
});

// Check in to event
router.post("/api/events/:id/attend", requireAuth, eventCheckInLimiter, eventAntiCheat, async (req: AuthRequest, res: Response) => {
  try {
    const { coordinates } = req.body;
    const antiCheatData = (req as any).antiCheat;

    if (!antiCheatData) {
      return res.status(403).json({ success: false, error: "Security validation failed" });
    }

    const { memberId, ipAddress, userAgent, fingerprint } = antiCheatData;

    const event = await db.query.events.findFirst({
      where: eq(schema.events.id, req.params.id)
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    const uniqueCheck = await antiCheatService.verifyUniqueEventAttendance(memberId, req.params.id);
    if (!uniqueCheck.valid) {
      return res.status(400).json({ success: false, error: uniqueCheck.error });
    }

    const timingCheck = await antiCheatService.validateEventTiming(req.params.id);
    if (!timingCheck.valid) {
      return res.status(400).json({ success: false, error: timingCheck.error });
    }

    const pointsEarned = 10; // Base points for event attendance

    const [attendance] = await db.insert(schema.eventAttendances).values({
      eventId: req.params.id,
      memberId,
      checkedInAt: new Date(),
      coordinates: coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null
    }).returning();

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, memberId)
    });

    if (member) {
      await db.update(schema.members)
        .set({
          pointBalance: (member.pointBalance || 0) + pointsEarned,
          totalPointsEarned: (member.totalPointsEarned || 0) + pointsEarned
        })
        .where(eq(schema.members.id, memberId));

      const ledgerService = PointLedgerService.getInstance();
      await ledgerService.recordTransaction({
        memberId,
        amount: pointsEarned,
        type: "earned",
        source: "event_attendance",
        description: `Points earned from event attendance: ${event.title}`,
        resourceId: req.params.id,
        resourceType: "event"
      });
    }

    await logAudit({
      userId: req.user!.id,
      memberId,
      action: AuditActions.EVENT_CHECKIN,
      resourceType: "event",
      resourceId: req.params.id,
      details: { attendanceId: attendance.id, pointsEarned, coordinates },
      ipAddress,
      userAgent,
      fingerprint,
      status: "success",
    });

    res.json({
      success: true,
      data: {
        attendance,
        pointsEarned,
        message: `Successfully checked in! Earned ${pointsEarned} points.`
      }
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(400).json({
        success: false,
        error: "Already checked in to this event"
      });
    }
    console.error("Event check-in error:", error);
    res.status(500).json({ success: false, error: "Failed to check in to event" });
  }
});

export default router;
