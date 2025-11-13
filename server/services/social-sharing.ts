import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { pointLedgerService } from "./point-ledger";
import crypto from "crypto";

const SHARE_REWARD_POINTS = 10;

export interface RecordShareParams {
  memberId: string;
  platform: string;
  contentType: string;
  contentId: string;
  shareUrl?: string;
}

export interface VerifyShareParams {
  shareId: string;
  verificationMethod: string;
  proofUrl?: string;
  verifiedBy: string;
  approved: boolean;
  rejectionReason?: string;
}

export class SocialSharingService {
  private generateShareHash(memberId: string, platform: string, contentType: string, contentId: string): string {
    return crypto
      .createHash("sha256")
      .update(`${memberId}-${platform}-${contentType}-${contentId}`)
      .digest("hex");
  }

  async recordShare(params: RecordShareParams) {
    const { memberId, platform, contentType, contentId, shareUrl } = params;

    const shareHash = this.generateShareHash(memberId, platform, contentType, contentId);

    return await db.transaction(async (tx) => {
      const member = await tx.query.members.findFirst({
        where: eq(schema.members.id, memberId),
      });

      if (!member) {
        throw new Error("Member not found");
      }

      const existingShare = await tx.query.socialShares.findFirst({
        where: and(
          eq(schema.socialShares.memberId, memberId),
          eq(schema.socialShares.platform, platform),
          eq(schema.socialShares.shareHash, shareHash)
        ),
      });

      if (existingShare) {
        throw new Error(
          `You have already shared this ${contentType} on ${platform}. Cannot earn duplicate points.`
        );
      }

      const [share] = await tx
        .insert(schema.socialShares)
        .values({
          memberId,
          platform,
          contentType,
          contentId,
          shareUrl: shareUrl || null,
          shareHash,
          verified: false,
          pointsAwarded: 0,
        })
        .returning();

      await pointLedgerService.addPoints({
        memberId,
        points: SHARE_REWARD_POINTS,
        transactionType: "social_share",
        source: `share_${platform}`,
        referenceType: "social_share",
        referenceId: share.id,
        metadata: {
          platform,
          contentType,
          contentId,
          shareUrl,
          autoVerified: true,
        },
      }, tx);

      await tx
        .update(schema.socialShares)
        .set({
          verified: true,
          pointsAwarded: SHARE_REWARD_POINTS,
          verifiedAt: new Date(),
        })
        .where(eq(schema.socialShares.id, share.id));

      return {
        share: {
          ...share,
          verified: true,
          pointsAwarded: SHARE_REWARD_POINTS,
          verifiedAt: new Date(),
        },
        pointsEarned: SHARE_REWARD_POINTS,
        message: `Share recorded! You earned ${SHARE_REWARD_POINTS} points.`,
      };
    });
  }

  async verifyShare(params: VerifyShareParams) {
    const { shareId, verificationMethod, proofUrl, verifiedBy, approved, rejectionReason } = params;

    return await db.transaction(async (tx) => {
      const share = await tx.query.socialShares.findFirst({
        where: eq(schema.socialShares.id, shareId),
      });

      if (!share) {
        throw new Error("Share not found");
      }

      if (share.verified) {
        throw new Error("Share already verified");
      }

      const [verification] = await tx
        .insert(schema.shareVerifications)
        .values({
          shareId,
          verificationMethod,
          proofUrl: proofUrl || null,
          verifiedBy,
          status: approved ? "approved" : "rejected",
          rejectionReason: approved ? null : rejectionReason || "Verification failed",
          verifiedAt: new Date(),
        })
        .returning();

      if (approved) {
        await pointLedgerService.addPoints({
          memberId: share.memberId,
          points: SHARE_REWARD_POINTS,
          transactionType: "social_share",
          source: `share_${share.platform}`,
          referenceType: "social_share",
          referenceId: shareId,
          metadata: {
            platform: share.platform,
            contentType: share.contentType,
            contentId: share.contentId,
            verificationMethod,
            verifiedBy,
          },
        }, tx);

        await tx
          .update(schema.socialShares)
          .set({
            verified: true,
            pointsAwarded: SHARE_REWARD_POINTS,
            verifiedAt: new Date(),
          })
          .where(eq(schema.socialShares.id, shareId));

        return {
          verification,
          pointsAwarded: SHARE_REWARD_POINTS,
          approved: true,
        };
      } else {
        await tx
          .update(schema.socialShares)
          .set({
            verified: false,
            pointsAwarded: 0,
          })
          .where(eq(schema.socialShares.id, shareId));

        return {
          verification,
          pointsAwarded: 0,
          approved: false,
          rejectionReason: rejectionReason || "Verification failed",
        };
      }
    });
  }

  async getMyShares(memberId: string) {
    const shares = await db.query.socialShares.findMany({
      where: eq(schema.socialShares.memberId, memberId),
      orderBy: desc(schema.socialShares.createdAt),
    });

    return shares;
  }

  async getShareStats(memberId: string) {
    const shares = await this.getMyShares(memberId);
    
    const totalShares = shares.length;
    const verifiedShares = shares.filter((s) => s.verified).length;
    const totalPointsEarned = shares.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);
    
    const platformBreakdown = shares.reduce((acc, share) => {
      acc[share.platform] = (acc[share.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalShares,
      verifiedShares,
      totalPointsEarned,
      platformBreakdown,
    };
  }
}

export const socialSharingService = new SocialSharingService();
