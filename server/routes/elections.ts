import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { votingLimiter } from "../middleware/rate-limit";
import { voteAntiCheat } from "../middleware/anti-cheat";
import { antiCheatService } from "../security/anti-cheat";
import { logAudit, AuditActions } from "../utils/audit-logger";

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

// Get all elections
router.get("/api/elections", async (req: AuthRequest, res: Response) => {
  try {
    const elections = await db.query.elections.findMany({
      with: {
        candidates: true
      },
      orderBy: desc(schema.elections.createdAt)
    });

    res.json({ success: true, data: elections });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch elections" });
  }
});

// Get single election
router.get("/api/elections/:id", async (req: AuthRequest, res: Response) => {
  try {
    const election = await db.query.elections.findFirst({
      where: eq(schema.elections.id, req.params.id),
      with: {
        candidates: true
      }
    });

    if (!election) {
      return res.status(404).json({ success: false, error: "Election not found" });
    }

    res.json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch election" });
  }
});

// Create election
router.post("/api/elections", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, electionDate, position, status } = req.body;

    if (!title || !position) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const startDateValue = electionDate ? new Date(electionDate) : new Date();
    const endDateValue = new Date(startDateValue.getTime() + 24 * 60 * 60 * 1000);
    const [election] = await db.insert(schema.elections).values({
      title,
      description,
      startDate: startDateValue,
      endDate: endDateValue,
      position,
      status: status || "upcoming",
      totalVotes: 0
    }).returning();

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    await logAudit({
      userId: req.user!.id,
      memberId: member?.id,
      action: AuditActions.CREATE_ELECTION,
      resourceType: "election",
      resourceId: election.id,
      details: { title, position },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.status(201).json({ success: true, data: election });
  } catch (error: any) {
    console.error("Error creating election:", error);
    res.status(500).json({ success: false, error: "Failed to create election" });
  }
});

// Update election
router.patch("/api/elections/:id", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, electionDate, position, status } = req.body;

    const election = await db.query.elections.findFirst({
      where: eq(schema.elections.id, req.params.id)
    });

    if (!election) {
      return res.status(404).json({ success: false, error: "Election not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (electionDate !== undefined) {
      updateData.startDate = new Date(electionDate);
      updateData.endDate = new Date(new Date(electionDate).getTime() + 24 * 60 * 60 * 1000);
    }
    if (position !== undefined) updateData.position = position;
    if (status !== undefined) updateData.status = status;

    const [updatedElection] = await db.update(schema.elections)
      .set(updateData)
      .where(eq(schema.elections.id, req.params.id))
      .returning();

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    await logAudit({
      userId: req.user!.id,
      memberId: member?.id,
      action: AuditActions.UPDATE_ELECTION,
      resourceType: "election",
      resourceId: req.params.id,
      details: { changes: updateData },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: updatedElection });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to update election" });
  }
});

// Add candidate to election
router.post("/api/elections/:id/candidates", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, party, platform } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Candidate name is required" });
    }

    const election = await db.query.elections.findFirst({
      where: eq(schema.elections.id, req.params.id)
    });

    if (!election) {
      return res.status(404).json({ success: false, error: "Election not found" });
    }

    const [candidate] = await db.insert(schema.candidates).values({
      electionId: req.params.id,
      name,
      manifesto: platform || "",
      experience: "",
      votes: 0
    }).returning();

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    await logAudit({
      userId: req.user!.id,
      memberId: member?.id,
      action: AuditActions.ADD_CANDIDATE,
      resourceType: "election",
      resourceId: req.params.id,
      details: { candidateName: name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.status(201).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to add candidate" });
  }
});

// Cast vote
router.post("/api/elections/:id/vote", votingLimiter, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: "Candidate ID is required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const election = await db.query.elections.findFirst({
      where: eq(schema.elections.id, req.params.id),
      with: { candidates: true }
    });

    if (!election) {
      return res.status(404).json({ success: false, error: "Election not found" });
    }

    // Check if already voted
    const existingVote = await db.query.votes.findFirst({
      where: and(
        eq(schema.votes.electionId, req.params.id),
        eq(schema.votes.voterId, member.id)
      )
    });

    if (existingVote) {
      return res.status(400).json({ success: false, error: "You have already voted in this election" });
    }

    // Verify candidate exists in this election
    const candidate = election.candidates.find(c => c.id === candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    const [vote] = await db.insert(schema.votes).values({
      electionId: req.params.id,
      voterId: member.id,
      candidateId: candidateId
    }).returning();

    // Update candidate vote count
    const currentVotes = candidate.votes || 0;
    await db.update(schema.candidates)
      .set({ votes: currentVotes + 1 })
      .where(eq(schema.candidates.id, candidateId));

    // Update election total votes
    const currentTotal = election.totalVotes || 0;
    await db.update(schema.elections)
      .set({ totalVotes: currentTotal + 1 })
      .where(eq(schema.elections.id, req.params.id));

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.CAST_VOTE,
      resourceType: "election",
      resourceId: req.params.id,
      details: { candidateId, candidateName: candidate.name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.json({ success: true, data: vote });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to cast vote" });
  }
});

// Get election results
router.get("/api/elections/:id/results", async (req: Request, res: Response) => {
  try {
    const election = await db.query.elections.findFirst({
      where: eq(schema.elections.id, req.params.id),
      with: { candidates: true }
    });

    if (!election) {
      return res.status(404).json({ success: false, error: "Election not found" });
    }

    const sortedCandidates = [...election.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));

    res.json({
      success: true,
      data: {
        election,
        candidates: sortedCandidates,
        totalVotes: election.totalVotes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch results" });
  }
});

export default router;
