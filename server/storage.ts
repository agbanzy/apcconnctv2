import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, sql, asc, desc, inArray } from "drizzle-orm";
import { PaginatedResponse, FilterDTO, BulkAction } from "@shared/admin-types";

// Storage interface
interface IStorage {
  listAuditLogs(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.auditLogs.$inferSelect>>;
  listQuizzes(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.quizzes.$inferSelect>>;
  bulkUpdateMembers(ids: string[], action: BulkAction): Promise<void>;
}

// Database storage implementation
class DbStorage implements IStorage {
  constructor(private db: typeof import("./db").db) {}

  async listAuditLogs(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.auditLogs.action} ILIKE ${`%${search}%`} OR 
             ${schema.auditLogs.resourceType} ILIKE ${`%${search}%`} OR
             ${schema.auditLogs.ipAddress} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.action) {
      whereConditions.push(eq(schema.auditLogs.action, filters.action as string));
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.auditLogs.status, filters.status as string));
    }
    
    if (filters.suspicious === 'true') {
      whereConditions.push(eq(schema.auditLogs.suspiciousActivity, true));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    // Safe column mapping for sorting (only allow whitelisted columns)
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.auditLogs.createdAt,
      action: schema.auditLogs.action,
      status: schema.auditLogs.status,
      fraudScore: schema.auditLogs.fraudScore,
      suspiciousActivity: schema.auditLogs.suspiciousActivity,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.auditLogs.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.auditLogs.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.auditLogs)
        .where(whereClause)
    ]);
    
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async listQuizzes(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.quizzes.question} ILIKE ${`%${search}%`} OR 
             ${schema.quizzes.category} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.category) {
      whereConditions.push(eq(schema.quizzes.category, filters.category as string));
    }
    
    if (filters.difficulty) {
      whereConditions.push(eq(schema.quizzes.difficulty, filters.difficulty as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    // Safe column mapping for sorting (only allow whitelisted columns)
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.quizzes.createdAt,
      question: schema.quizzes.question,
      category: schema.quizzes.category,
      difficulty: schema.quizzes.difficulty,
      points: schema.quizzes.points,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.quizzes.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.quizzes.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.quizzes)
        .where(whereClause)
    ]);
    
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async bulkUpdateMembers(ids: string[], action: BulkAction) {
    switch (action) {
      case BulkAction.APPROVE:
        // Approve = set status to active
        await this.db.update(schema.members)
          .set({ status: 'active' })
          .where(inArray(schema.members.id, ids));
        break;
      case BulkAction.REJECT:
        // Reject = set status to expired (inactive)
        await this.db.update(schema.members)
          .set({ status: 'expired' })
          .where(inArray(schema.members.id, ids));
        break;
      case BulkAction.BAN:
        // Ban = set status to expired (inactive/banned)
        await this.db.update(schema.members)
          .set({ status: 'expired' })
          .where(inArray(schema.members.id, ids));
        break;
      case BulkAction.UNBAN:
        // Unban = set status to active
        await this.db.update(schema.members)
          .set({ status: 'active' })
          .where(inArray(schema.members.id, ids));
        break;
      case BulkAction.VERIFY:
        // Verify NIN
        await this.db.update(schema.members)
          .set({ ninVerified: true })
          .where(inArray(schema.members.id, ids));
        break;
      case BulkAction.UNVERIFY:
        // Unverify NIN
        await this.db.update(schema.members)
          .set({ ninVerified: false })
          .where(inArray(schema.members.id, ids));
        break;
      default:
        throw new Error(`Unsupported bulk action: ${action}`);
    }
  }
}

// Export storage instance
export { db };
export const storage = new DbStorage(db);
