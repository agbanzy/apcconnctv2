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

router.get("/api/news", async (req: Request, res: Response) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const posts = await db.query.newsPosts.findMany({
      orderBy: desc(schema.newsPosts.publishedAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        author: true
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

router.get("/api/news/:id", async (req: Request, res: Response) => {
  try {
    const post = await db.query.newsPosts.findFirst({
      where: eq(schema.newsPosts.id, req.params.id),
      with: {
        author: true
      }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "News post not found" });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch news post" });
  }
});

router.post("/api/news", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, imageUrl, category } = req.body;

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
      excerpt: content.substring(0, 200),
      content,
      category: category || "General",
      imageUrl: imageUrl || null,
      authorId: req.user!.id,
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

    const existingLike = await db.query.postEngagement.findFirst({
      where: and(
        eq(schema.postEngagement.postId, req.params.id),
        eq(schema.postEngagement.memberId, member.id),
        eq(schema.postEngagement.type, "like")
      )
    });

    if (existingLike) {
      await db.delete(schema.postEngagement).where(eq(schema.postEngagement.id, existingLike.id));
      await db.update(schema.newsPosts)
        .set({ likes: sql`GREATEST(${schema.newsPosts.likes} - 1, 0)` })
        .where(eq(schema.newsPosts.id, req.params.id));

      return res.json({ success: true, data: { liked: false } });
    }

    await db.insert(schema.postEngagement).values({
      postId: req.params.id,
      memberId: member.id,
      type: "like"
    });

    await db.update(schema.newsPosts)
      .set({ likes: sql`COALESCE(${schema.newsPosts.likes}, 0) + 1` })
      .where(eq(schema.newsPosts.id, req.params.id));

    res.json({ success: true, data: { liked: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to like news post" });
  }
});

router.get("/api/news/:id/comments", async (req: Request, res: Response) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const comments = await db.query.newsComments.findMany({
      where: eq(schema.newsComments.newsPostId, req.params.id),
      orderBy: desc(schema.newsComments.createdAt),
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
      data: {
        comments,
        count: comments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch comments" });
  }
});

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
      memberId: member.id,
      content: comment
    }).returning();

    await db.update(schema.newsPosts)
      .set({ comments: sql`COALESCE(${schema.newsPosts.comments}, 0) + 1` })
      .where(eq(schema.newsPosts.id, req.params.id));

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add comment" });
  }
});

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
        eq(schema.newsCommentLikes.commentId, req.params.id),
        eq(schema.newsCommentLikes.memberId, member.id)
      )
    });

    if (existingLike) {
      await db.delete(schema.newsCommentLikes).where(eq(schema.newsCommentLikes.id, existingLike.id));
      await db.update(schema.newsComments)
        .set({ likes: sql`GREATEST(${schema.newsComments.likes} - 1, 0)` })
        .where(eq(schema.newsComments.id, req.params.id));

      return res.json({ success: true, data: { liked: false } });
    }

    await db.insert(schema.newsCommentLikes).values({
      commentId: req.params.id,
      memberId: member.id
    });

    await db.update(schema.newsComments)
      .set({ likes: sql`COALESCE(${schema.newsComments.likes}, 0) + 1` })
      .where(eq(schema.newsComments.id, req.params.id));

    res.json({ success: true, data: { liked: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to like comment" });
  }
});

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
      memberId: member.id,
      content: reply,
      parentId: req.params.id
    }).returning();

    res.status(201).json({ success: true, data: replyComment });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add reply" });
  }
});

router.delete("/api/news/comments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await db.query.newsComments.findFirst({
      where: eq(schema.newsComments.id, req.params.id),
      with: { member: { with: { user: true } } }
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    if (req.user!.id !== comment.member.user.id && req.user!.role !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await db.delete(schema.newsComments).where(eq(schema.newsComments.id, req.params.id));

    await db.update(schema.newsPosts)
      .set({ comments: sql`GREATEST(${schema.newsPosts.comments} - 1, 0)` })
      .where(eq(schema.newsPosts.id, comment.newsPostId));

    res.json({ success: true, data: { message: "Comment deleted" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete comment" });
  }
});

export default router;
