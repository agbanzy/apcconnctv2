import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface AddPointsParams {
  memberId: string;
  points: number;
  transactionType: string;
  source: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionHistoryFilters {
  page?: number;
  pageSize?: number;
  transactionType?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TransactionHistoryResult {
  data: typeof schema.userPoints.$inferSelect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentBalance: number;
}

export class PointLedgerService {
  async addPoints(params: AddPointsParams, tx?: any): Promise<typeof schema.userPoints.$inferSelect> {
    const { memberId, points, transactionType, source, referenceType, referenceId, metadata } = params;

    if (points <= 0) {
      throw new Error("Points must be greater than 0");
    }

    const doWork = async (txClient: any) => {
      const member = await txClient.query.members.findFirst({
        where: eq(schema.members.id, memberId),
      });

      if (!member) {
        throw new Error("Member not found");
      }

      const currentBalance = await this.getBalanceInTransaction(txClient, memberId);
      const newBalance = currentBalance + points;

      const [ledgerEntry] = await txClient.insert(schema.userPoints).values({
        memberId,
        transactionType,
        source,
        amount: points,
        balanceAfter: newBalance,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        metadata: metadata || null,
      }).returning();

      return ledgerEntry;
    };

    if (tx) {
      return await doWork(tx);
    } else {
      return await db.transaction(doWork);
    }
  }

  async deductPoints(params: AddPointsParams, tx?: any): Promise<typeof schema.userPoints.$inferSelect> {
    const { memberId, points, transactionType, source, referenceType, referenceId, metadata } = params;

    if (points <= 0) {
      throw new Error("Points must be greater than 0");
    }

    const doWork = async (txClient: any) => {
      const member = await txClient.query.members.findFirst({
        where: eq(schema.members.id, memberId),
      });

      if (!member) {
        throw new Error("Member not found");
      }

      const currentBalance = await this.getBalanceInTransaction(txClient, memberId);
      const newBalance = currentBalance - points;

      if (newBalance < 0 && !metadata?.adminOverride) {
        throw new Error("Insufficient points balance");
      }

      const [ledgerEntry] = await txClient.insert(schema.userPoints).values({
        memberId,
        transactionType,
        source,
        amount: -points,
        balanceAfter: newBalance,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        metadata: metadata || null,
      }).returning();

      return ledgerEntry;
    };

    if (tx) {
      return await doWork(tx);
    } else {
      return await db.transaction(doWork);
    }
  }

  async getBalance(memberId: string, tx?: any): Promise<number> {
    const client = tx || db;
    
    const member = await client.query.members.findFirst({
      where: eq(schema.members.id, memberId),
    });

    if (!member) {
      throw new Error("Member not found");
    }

    const latestTransaction = await client.query.userPoints.findFirst({
      where: eq(schema.userPoints.memberId, memberId),
      orderBy: desc(schema.userPoints.createdAt),
    });

    return latestTransaction?.balanceAfter || 0;
  }

  private async getBalanceInTransaction(tx: any, memberId: string): Promise<number> {
    const latestTransaction = await tx.query.userPoints.findFirst({
      where: eq(schema.userPoints.memberId, memberId),
      orderBy: desc(schema.userPoints.createdAt),
    });

    return latestTransaction?.balanceAfter || 0;
  }

  async getTransactionHistory(
    memberId: string,
    filters: TransactionHistoryFilters = {}
  ): Promise<TransactionHistoryResult> {
    const { page = 1, pageSize = 20, transactionType, source, startDate, endDate } = filters;
    const offset = (page - 1) * pageSize;

    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, memberId),
    });

    if (!member) {
      throw new Error("Member not found");
    }

    let whereConditions: any[] = [eq(schema.userPoints.memberId, memberId)];

    if (transactionType) {
      whereConditions.push(eq(schema.userPoints.transactionType, transactionType));
    }

    if (source) {
      whereConditions.push(eq(schema.userPoints.source, source));
    }

    if (startDate) {
      whereConditions.push(sql`${schema.userPoints.createdAt} >= ${startDate}`);
    }

    if (endDate) {
      whereConditions.push(sql`${schema.userPoints.createdAt} <= ${endDate}`);
    }

    const whereClause = and(...whereConditions);

    const [data, countResult] = await Promise.all([
      db.query.userPoints.findMany({
        where: whereClause,
        orderBy: desc(schema.userPoints.createdAt),
        limit: pageSize,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(schema.userPoints)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    const currentBalance = await this.getBalance(memberId);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      currentBalance,
    };
  }

  async transferPoints(
    fromMemberId: string,
    toMemberId: string,
    points: number,
    reason: string,
    tx?: any
  ): Promise<{ from: typeof schema.userPoints.$inferSelect; to: typeof schema.userPoints.$inferSelect }> {
    if (points <= 0) {
      throw new Error("Points must be greater than 0");
    }

    if (fromMemberId === toMemberId) {
      throw new Error("Cannot transfer points to yourself");
    }

    const doWork = async (txClient: any) => {
      const [fromMember, toMember] = await Promise.all([
        txClient.query.members.findFirst({ where: eq(schema.members.id, fromMemberId) }),
        txClient.query.members.findFirst({ where: eq(schema.members.id, toMemberId) }),
      ]);

      if (!fromMember) {
        throw new Error("Sender member not found");
      }

      if (!toMember) {
        throw new Error("Recipient member not found");
      }

      const fromBalance = await this.getBalanceInTransaction(txClient, fromMemberId);
      
      if (fromBalance < points) {
        throw new Error("Insufficient points balance");
      }

      const toBalance = await this.getBalanceInTransaction(txClient, toMemberId);

      const [fromEntry] = await txClient.insert(schema.userPoints).values({
        memberId: fromMemberId,
        transactionType: "transfer",
        source: "transfer_out",
        amount: -points,
        balanceAfter: fromBalance - points,
        referenceType: "transfer",
        referenceId: toMemberId,
        metadata: { reason, recipientId: toMemberId },
      }).returning();

      const [toEntry] = await txClient.insert(schema.userPoints).values({
        memberId: toMemberId,
        transactionType: "transfer",
        source: "transfer_in",
        amount: points,
        balanceAfter: toBalance + points,
        referenceType: "transfer",
        referenceId: fromMemberId,
        metadata: { reason, senderId: fromMemberId },
      }).returning();

      return { from: fromEntry, to: toEntry };
    };

    if (tx) {
      return await doWork(tx);
    } else {
      return await db.transaction(doWork);
    }
  }
}

export const pointLedgerService = new PointLedgerService();
