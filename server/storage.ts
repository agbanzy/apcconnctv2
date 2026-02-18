import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, sql, asc, desc, inArray } from "drizzle-orm";
import { PaginatedResponse, FilterDTO, BulkAction } from "@shared/admin-types";

// Storage interface
interface IStorage {
  listAuditLogs(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.auditLogs.$inferSelect>>;
  listQuizzes(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.quizzes.$inferSelect>>;
  bulkUpdateMembers(ids: string[], action: BulkAction): Promise<void>;
  
  // Elections Admin
  listElections(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Events Admin
  listEvents(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Content/News Admin
  listNews(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Campaigns Admin
  listCampaigns(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  bulkUpdateCampaigns(ids: string[], action: BulkAction): Promise<void>;
  
  // Incidents Admin
  listIncidents(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Knowledge Base Admin
  listKnowledgeArticles(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Tasks Admin (volunteer + micro)
  listTasks(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Donations Admin
  listDonations(filters: FilterDTO): Promise<PaginatedResponse<any>>;
  
  // Point Ledger
  getMemberPointBalance(memberId: string): Promise<number>;
  getMemberPointTransactions(memberId: string, filters: FilterDTO): Promise<PaginatedResponse<typeof schema.userPoints.$inferSelect>>;
  
  // Point Purchases
  listPointPurchases(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.pointPurchases.$inferSelect>>;
  getPointPurchaseByReference(reference: string): Promise<typeof schema.pointPurchases.$inferSelect | undefined>;
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

  // Elections Admin
  async listElections(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.elections.title} ILIKE ${`%${search}%`} OR 
             ${schema.elections.position} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.elections.status, filters.status as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.elections.createdAt,
      title: schema.elections.title,
      startDate: schema.elections.startDate,
      endDate: schema.elections.endDate,
      totalVotes: schema.elections.totalVotes,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.elections.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.elections.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          candidates: true,
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.elections)
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

  // Events Admin
  async listEvents(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'date', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.events.title} ILIKE ${`%${search}%`} OR 
             ${schema.events.location} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.category) {
      whereConditions.push(eq(schema.events.category, filters.category as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.events.createdAt,
      date: schema.events.date,
      title: schema.events.title,
      category: schema.events.category,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.events.date;
    
    const [data, countResult] = await Promise.all([
      this.db.query.events.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          rsvps: true,
          attendance: true,
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(whereClause)
    ]);
    
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    
    // Calculate RSVP counts
    const eventsWithCounts = data.map(event => ({
      ...event,
      rsvpCount: event.rsvps?.length || 0,
      attendedCount: event.attendance?.length || 0,
    }));
    
    return {
      data: eventsWithCounts,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  // Content/News Admin
  async listNews(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'publishedAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.newsPosts.title} ILIKE ${`%${search}%`} OR 
             ${schema.newsPosts.excerpt} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.category) {
      whereConditions.push(eq(schema.newsPosts.category, filters.category as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      publishedAt: schema.newsPosts.publishedAt,
      title: schema.newsPosts.title,
      category: schema.newsPosts.category,
      likes: schema.newsPosts.likes,
      comments: schema.newsPosts.comments,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.newsPosts.publishedAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.newsPosts.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          author: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.newsPosts)
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

  // Campaigns Admin
  async listCampaigns(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.issueCampaigns.title} ILIKE ${`%${search}%`} OR 
             ${schema.issueCampaigns.description} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.issueCampaigns.status, filters.status as any));
    }
    
    if (filters.category) {
      whereConditions.push(eq(schema.issueCampaigns.category, filters.category as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.issueCampaigns.createdAt,
      title: schema.issueCampaigns.title,
      status: schema.issueCampaigns.status,
      currentVotes: schema.issueCampaigns.currentVotes,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.issueCampaigns.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.issueCampaigns.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          author: {
            columns: {
              id: true,
            },
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          votes: true,
          comments: true,
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.issueCampaigns)
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

  async bulkUpdateCampaigns(ids: string[], action: BulkAction) {
    switch (action) {
      case BulkAction.APPROVE:
        await this.db.update(schema.issueCampaigns)
          .set({ status: 'approved' })
          .where(inArray(schema.issueCampaigns.id, ids));
        break;
      case BulkAction.REJECT:
        await this.db.update(schema.issueCampaigns)
          .set({ status: 'rejected' })
          .where(inArray(schema.issueCampaigns.id, ids));
        break;
      case BulkAction.DELETE:
        await this.db.delete(schema.issueCampaigns)
          .where(inArray(schema.issueCampaigns.id, ids));
        break;
      default:
        throw new Error(`Unsupported bulk action for campaigns: ${action}`);
    }
  }

  // Incidents Admin
  async listIncidents(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.incidents.description} ILIKE ${`%${search}%`} OR 
             ${schema.incidents.location} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.incidents.status, filters.status as string));
    }
    
    if (filters.severity) {
      whereConditions.push(eq(schema.incidents.severity, filters.severity as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.incidents.createdAt,
      severity: schema.incidents.severity,
      status: schema.incidents.status,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.incidents.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.incidents.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          reporter: {
            columns: {
              id: true,
            },
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          pollingUnit: {
            columns: {
              name: true,
              unitCode: true,
            }
          },
          media: true
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.incidents)
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

  // Knowledge Base Admin
  async listKnowledgeArticles(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.knowledgeArticles.title} ILIKE ${`%${search}%`} OR 
             ${schema.knowledgeArticles.summary} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.published !== undefined && filters.published !== '') {
      whereConditions.push(eq(schema.knowledgeArticles.published, filters.published === 'true'));
    }
    
    if (filters.categoryId) {
      whereConditions.push(eq(schema.knowledgeArticles.categoryId, filters.categoryId as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.knowledgeArticles.createdAt,
      updatedAt: schema.knowledgeArticles.updatedAt,
      title: schema.knowledgeArticles.title,
      viewsCount: schema.knowledgeArticles.viewsCount,
      helpfulCount: schema.knowledgeArticles.helpfulCount,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.knowledgeArticles.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.knowledgeArticles.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          category: {
            columns: {
              name: true,
              slug: true,
            }
          },
          author: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.knowledgeArticles)
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

  // Tasks Admin
  async listTasks(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.volunteerTasks.title} ILIKE ${`%${search}%`} OR 
             ${schema.volunteerTasks.description} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.volunteerTasks.status, filters.status as string));
    }
    
    if (filters.difficulty) {
      whereConditions.push(eq(schema.volunteerTasks.difficulty, filters.difficulty as any));
    }
    
    if (filters.category) {
      whereConditions.push(eq(schema.volunteerTasks.category, filters.category as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.volunteerTasks.createdAt,
      title: schema.volunteerTasks.title,
      difficulty: schema.volunteerTasks.difficulty,
      points: schema.volunteerTasks.points,
      currentVolunteers: schema.volunteerTasks.currentVolunteers,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.volunteerTasks.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.volunteerTasks.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          creator: {
            columns: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          applications: true,
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.volunteerTasks)
        .where(whereClause)
    ]);
    
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    
    // Add application counts
    const tasksWithCounts = data.map(task => ({
      ...task,
      applicationsCount: task.applications?.length || 0,
    }));
    
    return {
      data: tasksWithCounts,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  // Donations Admin
  async listDonations(filters: FilterDTO) {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.donations.donorName} ILIKE ${`%${search}%`} OR 
             ${schema.donations.donorEmail} ILIKE ${`%${search}%`} OR
             ${schema.donations.paystackReference} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.paymentStatus) {
      whereConditions.push(eq(schema.donations.paymentStatus, filters.paymentStatus as any));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.donations.createdAt,
      amount: schema.donations.amount,
      paymentStatus: schema.donations.paymentStatus,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.donations.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.donations.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          member: {
            columns: {
              id: true,
            },
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          },
          campaign: {
            columns: {
              title: true,
              category: true,
            }
          }
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.donations)
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

  async getMemberPointBalance(memberId: string): Promise<number> {
    const latestTransaction = await this.db.query.userPoints.findFirst({
      where: eq(schema.userPoints.memberId, memberId),
      orderBy: desc(schema.userPoints.createdAt),
    });

    return latestTransaction?.balanceAfter || 0;
  }

  async getMemberPointTransactions(memberId: string, filters: FilterDTO): Promise<PaginatedResponse<typeof schema.userPoints.$inferSelect>> {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [eq(schema.userPoints.memberId, memberId)];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.userPoints.source} ILIKE ${`%${search}%`} OR 
             ${schema.userPoints.transactionType} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.transactionType) {
      whereConditions.push(eq(schema.userPoints.transactionType, filters.transactionType as string));
    }
    
    if (filters.source) {
      whereConditions.push(eq(schema.userPoints.source, filters.source as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.userPoints.createdAt,
      amount: schema.userPoints.amount,
      balanceAfter: schema.userPoints.balanceAfter,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.userPoints.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.userPoints.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.userPoints)
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

  async listPointPurchases(filters: FilterDTO): Promise<PaginatedResponse<typeof schema.pointPurchases.$inferSelect>> {
    const { page = 1, pageSize = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        sql`(${schema.pointPurchases.paystackReference} ILIKE ${`%${search}%`})`
      );
    }
    
    if (filters.status) {
      whereConditions.push(eq(schema.pointPurchases.status, filters.status as string));
    }
    
    if (filters.memberId) {
      whereConditions.push(eq(schema.pointPurchases.memberId, filters.memberId as string));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;
    
    const allowedSortColumns: Record<string, any> = {
      createdAt: schema.pointPurchases.createdAt,
      completedAt: schema.pointPurchases.completedAt,
      pointsAmount: schema.pointPurchases.pointsAmount,
      nairaAmount: schema.pointPurchases.nairaAmount,
    };
    const sortColumn = allowedSortColumns[sortBy as string] || schema.pointPurchases.createdAt;
    
    const [data, countResult] = await Promise.all([
      this.db.query.pointPurchases.findMany({
        where: whereClause,
        orderBy: sortOrderFn(sortColumn),
        limit: pageSize,
        offset,
        with: {
          member: {
            with: {
              user: {
                columns: {
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              }
            }
          }
        }
      }),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.pointPurchases)
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

  async getPointPurchaseByReference(reference: string): Promise<typeof schema.pointPurchases.$inferSelect | undefined> {
    return await this.db.query.pointPurchases.findFirst({
      where: eq(schema.pointPurchases.paystackReference, reference),
    });
  }
}

// Export storage instance
export { db };
export const storage = new DbStorage(db);
