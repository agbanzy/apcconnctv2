import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt-utils";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

type UserType = typeof schema.users.$inferSelect;

interface AuthRequest extends Request {
  user?: UserType;
}

export const requireJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  try {
    const userId = verifyAccessToken(token);
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId)
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Invalid token" 
    });
  }
};
