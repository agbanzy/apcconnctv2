import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
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

// Get all news posts
router.get("/api/news", async (req: Request, res: Response) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const posts = await db.query.newsPosts.findMany({
      orderBy: desc(schema.newsPosts.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        author: {
          with: { user: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        posts,
        count: posts.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch news" });
  }
});

// Get single news post
router.get("/api/news/:id", async (req: Request, res: Response) => {
  try {
    const post = await db.query.newsPosts.findFirst({
      where: eq(schema.newsPosts.id, req.params.id),
      with: {
        author: {
          with: { user: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "News post not found" });
    }

    // Update view count
    await db.update(schema.newsPosts)
      .set({
        views: (post.views || 0) + 1
      })
      .where(eq(schema.newsPosts.id, req.params.id));

    res.json({
      success: true,
      data: {
        ...post,
        views: (post.views || 0) + 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch news post" });
  }
});

// Create news post
router.post("/api/news", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, imageUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: "Title and content are required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const [post] = await db.insert(schema.newsPosts).values({
      title,
      content,
      imageUrl: imageUrl || null,
      authorId: member.id,
      views: 0,
      likes: 0,
      comments: 0
    }).returning();

    await logAudit({
      userId: req.user!.id,
      memberId: member.id,
      action: AuditActions.CREATE_NEWS,
      resourceType: "news",
      resourceId: post.id,
      details: { title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: "success",
    });

    res.status(201).json({ success: true, data: post });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to create news post" });
  }
});

// Like news post
router.post("/api/news/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const post = await db.query.newsPosts.findFirst({
      where: eq(schema.newsPosts.id, req.params.id)
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "News post not found" });
    }

    // Check if already liked
    const existingLike = await db.query.newsLikes.findFirst({
      where: and(
        eq(schema.newsLikes.newsPostId, req.params.id),
        eq(schema.newsLikes.memberId, member.id)
      )
    });

    if (existingLike) {
      // Unlike
      await db.delete(schema.newsLikes).where(eq(schema.newsLikes.id, existingLike.id));
      await db.update(schema.newsPosts)
        .set({ likes: (post.likes || 0) - 1 })
        .where(eq(schema.newsPosts.id, req.params.id));

      return res.json({ success: true, data: { liked: false } });
    }

    // Like
    await db.insert(schema.newsLikes).values({
      newsPostId: req.params.id,
      memberId: member.id
    });

    await db.update(schema.newsPosts)
      .set({ likes: (post.likes || 0) + 1 })
      .where(eq(schema.newsPosts.id, req.params.id));

    res.json({ success: true, data: { liked: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to like news post" });
  }
});

// Get news comments
router.get("/api/news/:id/comments", async (req: Request, res: Response) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const comments = await db.query.newsComments.findMany({
      where: eq(schema.newsComments.newsPostId, req.params.id),
      orderBy: desc(schema.newsComments.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        author: {
          with: { user: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        comments,
        count: comments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch comments" });
  }
});

// Add comment to news post
router.post("/api/news/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, error: "Comment text is required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const post = await db.query.newsPosts.findFirst({
      where: eq(schema.newsPosts.id, req.params.id)
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "News post not found" });
    }

    const [newComment] = await db.insert(schema.newsComments).values({
      newsPostId: req.params.id,
      authorId: member.id,
      comment
    }).returning();

    await db.update(schema.newsPosts)
      .set({ comments: (post.comments || 0) + 1 })
      .where(eq(schema.newsPosts.id, req.params.id));

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add comment" });
  }
});

// Like comment
router.post("/api/news/comments/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const comment = await db.query.newsComments.findFirst({
      where: eq(schema.newsComments.id, req.params.id)
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const existingLike = await db.query.newsCommentLikes.findFirst({
      where: and(
        eq(schema.newsCommentLikes.newsCommentId, req.params.id),
        eq(schema.newsCommentLikes.memberId, member.id)
      )
    });

    if (existingLike) {
      await db.delete(schema.newsCommentLikes).where(eq(schema.newsCommentLikes.id, existingLike.id));
      await db.update(schema.newsComments)
        .set({ likes: (comment.likes || 0) - 1 })
        .where(eq(schema.newsComments.id, req.params.id));

      return res.json({ success: true, data: { liked: false } });
    }

    await db.insert(schema.newsCommentLikes).values({
      newsCommentId: req.params.id,
      memberId: member.id
    });

    await db.update(schema.newsComments)
      .set({ likes: (comment.likes || 0) + 1 })
      .where(eq(schema.newsComments.id, req.params.id));

    res.json({ success: true, data: { liked: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to like comment" });
  }
});

// Reply to comment
router.post("/api/news/comments/:id/reply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ success: false, error: "Reply text is required" });
    }

    const member = await db.query.members.findFirst({
      where: eq(schema.members.userId, req.user!.id)
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    const parentComment = await db.query.newsComments.findFirst({
      where: eq(schema.newsComments.id, req.params.id)
    });

    if (!parentComment) {
      return res.status(404).json({ success: false, error: "Parent comment not found" });
    }

    const [replyComment] = await db.insert(schema.newsComments).values({
      newsPostId: parentComment.newsPostId,
      authorId: member.id,
      comment: reply,
      parentCommentId: req.params.id
    }).returning();

    await db.update(schema.newsComments)
      .set({ replies: (parentComment.replies || 0) + 1 })
      .where(eq(schema.newsComments.id, req.params.id));

    res.status(201).json({ success: true, data: replyComment });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add reply" });
  }
});

// Delete comment
router.delete("/api/news/comments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await db.query.newsComments.findFirst({
      where: eq(schema.newsComments.id, req.params.id),
      with: { author: { with: { user: true } } }
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    if (req.user!.id !== comment.author.user.id && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await db.delete(schema.newsComments).where(eq(schema.newsComments.id, req.params.id));

    await db.update(schema.newsPosts)
      .set({ comments: sql`${schema.newsPosts.comments} - 1` })
      .where(eq(schema.newsPosts.id, comment.newsPostId));

    res.json({ success: true, data: { message: "Comment deleted" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete comment" });
  }
});

export default router;
