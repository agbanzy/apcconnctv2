import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { pointLedgerService } from "./point-ledger";
import crypto from "crypto";

const REFERRAL_REWARD_POINTS = 100;

export class ReferralService {
  private generateReferralCode(memberId: string): string {
    const hash = crypto.createHash("sha256").update(memberId + Date.now()).digest("hex");
    return hash.substring(0, 8).toUpperCase();
  }

  async getOrGenerateReferralCode(memberId: string) {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, memberId),
    });

    if (!member) {
      throw new Error("Member not found");
    }

    if (member.referralCode) {
      return {
        referralCode: member.referralCode,
        isNew: false,
      };
    }

    let referralCode = this.generateReferralCode(memberId);
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await db.query.members.findFirst({
        where: eq(schema.members.referralCode, referralCode),
      });

      if (!existing) {
        isUnique = true;
      } else {
        referralCode = this.generateReferralCode(memberId);
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique referral code");
    }

    await db
      .update(schema.members)
      .set({ referralCode })
      .where(eq(schema.members.id, memberId));

    return {
      referralCode,
      isNew: true,
    };
  }

  async activateReferral(referredMemberId: string, referralCode: string) {
    return await db.transaction(async (tx) => {
      const referredMember = await tx.query.members.findFirst({
        where: eq(schema.members.id, referredMemberId),
      });

      if (!referredMember) {
        throw new Error("Referred member not found");
      }

      const existingReferral = await tx.query.referrals.findFirst({
        where: eq(schema.referrals.referredId, referredMemberId),
      });

      if (existingReferral) {
        throw new Error("This member has already been referred");
      }

      if (referredMember.referredBy) {
        throw new Error("This member already has a referrer");
      }

      const referrer = await tx.query.members.findFirst({
        where: eq(schema.members.referralCode, referralCode),
      });

      if (!referrer) {
        throw new Error("Invalid referral code");
      }

      if (referrer.id === referredMemberId) {
        throw new Error("Cannot refer yourself");
      }

      await tx
        .update(schema.members)
        .set({ referredBy: referrer.id })
        .where(eq(schema.members.id, referredMemberId));

      const [referral] = await tx
        .insert(schema.referrals)
        .values({
          referrerId: referrer.id,
          referredId: referredMemberId,
          referralCode,
          pointsEarned: REFERRAL_REWARD_POINTS,
          status: "completed",
          completedAt: new Date(),
        })
        .returning();

      await pointLedgerService.addPoints({
        memberId: referrer.id,
        points: REFERRAL_REWARD_POINTS,
        transactionType: "referral",
        source: "referral_bonus",
        referenceType: "referral",
        referenceId: referral.id,
        metadata: {
          referredMemberId,
          referralCode,
          referredMemberName: `${referredMember.userId}`,
        },
      }, tx);

      return {
        referral,
        pointsAwarded: REFERRAL_REWARD_POINTS,
        referrerName: referrer.userId,
        message: `Referral activated! ${referrer.userId} earned ${REFERRAL_REWARD_POINTS} points.`,
      };
    });
  }

  async getMyReferrals(memberId: string) {
    const referrals = await db
      .select({
        referral: schema.referrals,
        referredMember: {
          id: schema.members.id,
          memberId: schema.members.memberId,
          userId: schema.members.userId,
        },
      })
      .from(schema.referrals)
      .innerJoin(schema.members, eq(schema.referrals.referredId, schema.members.id))
      .where(eq(schema.referrals.referrerId, memberId))
      .orderBy(desc(schema.referrals.createdAt));

    return referrals;
  }

  async getReferralStats(memberId: string) {
    const referrals = await db.query.referrals.findMany({
      where: eq(schema.referrals.referrerId, memberId),
    });

    const totalReferred = referrals.length;
    const completedReferrals = referrals.filter((r) => r.status === "completed").length;
    const totalPointsEarned = referrals.reduce(
      (sum, r) => sum + (r.pointsEarned || 0),
      0
    );

    const recentReferrals = await this.getMyReferrals(memberId);

    return {
      totalReferred,
      completedReferrals,
      totalPointsEarned,
      expectedPoints: REFERRAL_REWARD_POINTS,
      recentReferrals: recentReferrals.slice(0, 5),
    };
  }
}

export const referralService = new ReferralService();
