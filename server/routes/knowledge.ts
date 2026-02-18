import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, ilike, desc, sql, asc } from "drizzle-orm";

const router = Router();

// Get all knowledge categories
router.get("/api/knowledge/categories", async (req: Request, res: Response) => {
  try {
    const categories = await db.query.knowledgeCategories.findMany({
      orderBy: asc(schema.knowledgeCategories.name)
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

// Get all articles
router.get("/api/knowledge/articles", async (req: Request, res: Response) => {
  try {
    const { categoryId, limit = "20", offset = "0" } = req.query;

    let whereConditions: any = {};
    if (categoryId) {
      whereConditions.categoryId = eq(schema.knowledgeArticles.categoryId, categoryId as string);
    }

    const articles = await db.query.knowledgeArticles.findMany({
      where: whereConditions.categoryId,
      orderBy: desc(schema.knowledgeArticles.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: {
        articles,
        count: articles.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch articles" });
  }
});

// Get single article by slug
router.get("/api/knowledge/articles/:slug", async (req: Request, res: Response) => {
  try {
    const article = await db.query.knowledgeArticles.findFirst({
      where: eq(schema.knowledgeArticles.slug, req.params.slug),
      with: { category: true }
    });

    if (!article) {
      return res.status(404).json({ success: false, error: "Article not found" });
    }

    // Update view count
    await db.update(schema.knowledgeArticles)
      .set({
        viewsCount: (article.viewsCount || 0) + 1
      })
      .where(eq(schema.knowledgeArticles.id, article.id));

    res.json({
      success: true,
      data: {
        ...article,
        viewsCount: (article.viewsCount || 0) + 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch article" });
  }
});

// Get all FAQs
router.get("/api/knowledge/faqs", async (req: Request, res: Response) => {
  try {
    const { category, limit = "50", offset = "0" } = req.query;

    let whereConditions: any = undefined;
    if (category) {
      whereConditions = eq(schema.faqs.categoryId, category as string);
    }

    const faqs = await db.query.faqs.findMany({
      where: whereConditions,
      orderBy: asc(schema.faqs.order),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: {
        faqs,
        count: faqs.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch FAQs" });
  }
});

// Search knowledge base
router.get("/api/knowledge/search", async (req: Request, res: Response) => {
  try {
    const { q, type, limit = "20" } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: "Search query is required" });
    }

    const searchQuery = `%${q}%`;
    const results: any = {
      articles: [],
      faqs: [],
      facts: [],
      quotes: []
    };

    if (!type || type === "article") {
      const articles = await db.query.knowledgeArticles.findMany({
        where: ilike(schema.knowledgeArticles.title, searchQuery),
        limit: parseInt(limit as string)
      });
      results.articles = articles;
    }

    if (!type || type === "faq") {
      const faqs = await db.query.faqs.findMany({
        where: ilike(schema.faqs.question, searchQuery),
        limit: parseInt(limit as string)
      });
      results.faqs = faqs;
    }

    if (!type || type === "fact") {
      const facts = await db.query.politicalFacts.findMany({
        where: ilike(schema.politicalFacts.content, searchQuery),
        limit: parseInt(limit as string)
      });
      results.facts = facts;
    }

    if (!type || type === "quote") {
      const quotes = await db.query.politicalQuotes.findMany({
        where: ilike(schema.politicalQuotes.content, searchQuery),
        limit: parseInt(limit as string)
      });
      results.quotes = quotes;
    }

    res.json({
      success: true,
      data: results,
      totalResults: Object.values(results).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, error: "Failed to search knowledge base" });
  }
});

// Get facts
router.get("/api/knowledge/facts", async (req: Request, res: Response) => {
  try {
    const { limit = "50", offset = "0" } = req.query;

    const facts = await db.query.politicalFacts.findMany({
      orderBy: desc(schema.politicalFacts.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: {
        facts,
        count: facts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch facts" });
  }
});

// Get quotes
router.get("/api/knowledge/quotes", async (req: Request, res: Response) => {
  try {
    const { limit = "50", offset = "0" } = req.query;

    const quotes = await db.query.politicalQuotes.findMany({
      orderBy: desc(schema.politicalQuotes.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: {
        quotes,
        count: quotes.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch quotes" });
  }
});

// Get random knowledge item
router.get("/api/knowledge/random", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (type === "fact" || !type) {
      const randomFact = await db.query.politicalFacts.findFirst({
        orderBy: sql`RANDOM()`
      });
      if (randomFact) {
        return res.json({ success: true, data: { ...randomFact, type: "fact" } });
      }
    }

    if (type === "quote" || !type) {
      const randomQuote = await db.query.politicalQuotes.findFirst({
        orderBy: sql`RANDOM()`
      });
      if (randomQuote) {
        return res.json({ success: true, data: { ...randomQuote, type: "quote" } });
      }
    }

    res.status(404).json({ success: false, error: "No knowledge items found" });
  } catch (error) {
    console.error("Random fetch error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch random item" });
  }
});

export default router;
