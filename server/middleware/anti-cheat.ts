import { Request, Response, NextFunction } from "express";
import { antiCheatService, ActionType } from "../security/anti-cheat";
import { generateFingerprint } from "../security/crypto-tokens";
import { logAudit, AuditActions } from "../utils/audit-logger";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Request metadata extraction
 */
function extractRequestMetadata(req: Request) {
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") || "unknown";
  const fingerprint = generateFingerprint(ipAddress, userAgent);

  return { ipAddress, userAgent, fingerprint };
}

/**
 * Generic anti-cheat middleware for point-generating actions
 */
export function createAntiCheatMiddleware(actionType: ActionType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      // Fetch member from database using userId
      const member = await db.query.members.findFirst({
        where: eq(schema.members.userId, user.id)
      });

      if (!member) {
        return res.status(403).json({
          success: false,
          error: "Member profile required",
        });
      }

      const memberId = member.id;

      // Extract request metadata
      const { ipAddress, userAgent, fingerprint } = extractRequestMetadata(req);

      // Check if account is suspended
      const isSuspended = await antiCheatService.isSuspended(memberId);
      if (isSuspended) {
        await logAudit({
          memberId,
          action: AuditActions.LOGIN_FAILURE,
          resourceType: "member",
          resourceId: memberId,
          details: { reason: "Account suspended", actionType },
          ipAddress,
          userAgent,
          status: "failure",
        });

        return res.status(403).json({
          success: false,
          error: "Account suspended due to suspicious activity. Please contact support.",
        });
      }

      // Note: Rate limiting is handled by express-rate-limit middleware at the route level

      // Detect fraud patterns
      const fraudCheck = await antiCheatService.detectFraudPatterns(
        memberId,
        ipAddress
      );

      if (fraudCheck.suspicious) {
        await antiCheatService.logFraudDetection(
          memberId,
          actionType,
          fraudCheck.reasons.join(", "),
          fraudCheck.score > 80 ? "critical" : "high",
          fraudCheck.score > 80,
          { score: fraudCheck.score, reasons: fraudCheck.reasons },
          ipAddress,
          userAgent
        );

        // Auto-suspend if fraud score is too high
        if (fraudCheck.score > 80) {
          await antiCheatService.suspendAccount(
            memberId,
            `Automatic suspension: ${fraudCheck.reasons.join(", ")}`,
            "system",
            7 // 7 days suspension
          );

          return res.status(403).json({
            success: false,
            error: "Suspicious activity detected. Account temporarily suspended.",
          });
        }

        // Log warning but allow request to continue
        await logAudit({
          memberId,
          action: AuditActions.ADMIN_ACTION,
          resourceType: actionType,
          resourceId: null,
          details: {
            warning: "Suspicious activity detected",
            score: fraudCheck.score,
            reasons: fraudCheck.reasons,
          },
          ipAddress,
          userAgent,
          status: "success",
        });
      }

      // Attach metadata to request for use in route handlers
      (req as any).antiCheat = {
        ipAddress,
        userAgent,
        fingerprint,
        memberId,
      };

      next();
    } catch (error) {
      console.error(`Anti-cheat middleware error (${actionType}):`, error);
      next(error);
    }
  };
}

/**
 * Quiz-specific anti-cheat middleware
 */
export const quizAntiCheat = createAntiCheatMiddleware("quiz");

/**
 * Task-specific anti-cheat middleware
 */
export const taskAntiCheat = createAntiCheatMiddleware("task");

/**
 * Vote-specific anti-cheat middleware
 */
export const voteAntiCheat = createAntiCheatMiddleware("vote");

/**
 * Event-specific anti-cheat middleware
 */
export const eventAntiCheat = createAntiCheatMiddleware("event");
