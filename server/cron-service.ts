/**
 * APC Connect - Automated Cron Job Framework
 * ============================================
 * 
 * This module provides a framework for managing scheduled background tasks.
 * It includes a simulation mode for development and documentation for production
 * integration with popular job scheduling libraries.
 * 
 * ENVIRONMENT VARIABLES:
 * - ENABLE_CRON_JOBS: Set to "true" to enable cron jobs (default: false)
 * - TIMEZONE: Timezone for job scheduling (default: "Africa/Lagos")
 * 
 * PRODUCTION INTEGRATION OPTIONS:
 * 
 * 1. NODE-CRON (Simple, in-memory scheduling)
 *    npm install node-cron @types/node-cron
 *    Best for: Simple apps with single server instance
 * 
 * 2. AGENDA.JS (MongoDB-backed job queue)
 *    npm install agenda @types/agenda
 *    Best for: Distributed systems, job persistence, retries
 * 
 * 3. BULLMQ (Redis-backed job queue)
 *    npm install bullmq
 *    Best for: High-performance, scalable job processing
 */

import { db } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Cron schedule pattern (follows standard cron syntax)
 * Format: * * * * * (minute hour day month weekday)
 * 
 * Common patterns:
 * - "0 8 * * *"      - Daily at 8 AM
 * - "0 0 1 * *"      - First day of month at midnight
 * - "0 0 * * 0"      - Every Sunday at midnight
 * - "* /15 * * * *"   - Every 15 minutes
 * - "0 0 * * 1-5"    - Weekdays at midnight
 */
export type CronSchedule = string;

/**
 * Job configuration interface
 */
export interface JobConfig {
  name: string;
  schedule: CronSchedule;
  description: string;
  enabled: boolean;
  timezone?: string;
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

/**
 * Registered cron job
 */
export interface CronJob {
  config: JobConfig;
  task: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  status: "idle" | "running" | "error";
  errorCount: number;
}

/**
 * Job execution result
 */
export interface JobResult {
  success: boolean;
  message: string;
  duration: number;
  error?: Error;
}

// ============================================================================
// CRON SERVICE CLASS
// ============================================================================

class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private isRunning: boolean = false;
  private timezone: string = process.env.TIMEZONE || "Africa/Lagos";
  private enabled: boolean = process.env.ENABLE_CRON_JOBS === "true";

  // Simulation interval for development (runs every minute)
  private simulationInterval?: NodeJS.Timeout;

  constructor() {
    console.log(`[CronService] Initialized (enabled: ${this.enabled}, timezone: ${this.timezone})`);
  }

  /**
   * Register a new cron job
   */
  registerJob(name: string, schedule: CronSchedule, task: () => Promise<void>, options?: Partial<JobConfig>): void {
    const config: JobConfig = {
      name,
      schedule,
      description: options?.description || "",
      enabled: options?.enabled ?? true,
      timezone: options?.timezone || this.timezone,
      retryAttempts: options?.retryAttempts ?? 3,
      retryDelay: options?.retryDelay ?? 5000,
    };

    const job: CronJob = {
      config,
      task,
      status: "idle",
      errorCount: 0,
    };

    this.jobs.set(name, job);
    console.log(`[CronService] Registered job: ${name} (schedule: ${schedule})`);
  }

  /**
   * Start all registered cron jobs
   */
  start(): void {
    if (!this.enabled) {
      console.log("[CronService] Cron jobs are disabled. Set ENABLE_CRON_JOBS=true to enable.");
      return;
    }

    if (this.isRunning) {
      console.log("[CronService] Already running");
      return;
    }

    this.isRunning = true;
    console.log(`[CronService] Starting ${this.jobs.size} jobs...`);

    // SIMULATION MODE (Development)
    // In production, replace this with actual cron library implementation
    this.startSimulation();

    /* 
    // PRODUCTION: NODE-CRON IMPLEMENTATION
    // Uncomment when ready to use node-cron
    
    import cron from 'node-cron';
    
    for (const [name, job] of this.jobs) {
      if (!job.config.enabled) continue;
      
      const cronJob = cron.schedule(
        job.config.schedule,
        async () => {
          await this.executeJob(name);
        },
        {
          scheduled: true,
          timezone: job.config.timezone
        }
      );
      
      cronJob.start();
    }
    */

    /*
    // PRODUCTION: AGENDA.JS IMPLEMENTATION
    // Uncomment when ready to use Agenda.js with MongoDB
    
    import Agenda from 'agenda';
    
    const agenda = new Agenda({
      db: { address: process.env.MONGODB_URI || 'mongodb://localhost/apc-connect' }
    });
    
    for (const [name, job] of this.jobs) {
      if (!job.config.enabled) continue;
      
      agenda.define(name, async (agendaJob) => {
        await this.executeJob(name);
      });
      
      agenda.every(job.config.schedule, name, {
        timezone: job.config.timezone
      });
    }
    
    await agenda.start();
    */

    /*
    // PRODUCTION: BULLMQ IMPLEMENTATION
    // Uncomment when ready to use BullMQ with Redis
    
    import { Queue, Worker } from 'bullmq';
    
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    };
    
    for (const [name, job] of this.jobs) {
      if (!job.config.enabled) continue;
      
      const queue = new Queue(name, { connection });
      
      // Add repeatable job
      await queue.add(name, {}, {
        repeat: {
          pattern: job.config.schedule,
          tz: job.config.timezone
        }
      });
      
      // Create worker
      new Worker(name, async () => {
        await this.executeJob(name);
      }, { connection });
    }
    */
  }

  /**
   * Stop all running cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[CronService] Not running");
      return;
    }

    console.log("[CronService] Stopping all jobs...");
    
    // Stop simulation
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }

    this.isRunning = false;
    console.log("[CronService] Stopped");
  }

  /**
   * Execute a specific job with error handling and retry logic
   */
  private async executeJob(name: string): Promise<JobResult> {
    const job = this.jobs.get(name);
    if (!job) {
      return {
        success: false,
        message: `Job ${name} not found`,
        duration: 0,
      };
    }

    if (job.status === "running") {
      console.log(`[CronService] Job ${name} is already running, skipping...`);
      return {
        success: false,
        message: "Job already running",
        duration: 0,
      };
    }

    const startTime = Date.now();
    job.status = "running";
    job.lastRun = new Date();

    console.log(`[CronService] ⚡ Executing job: ${name}`);

    let attempt = 0;
    const maxAttempts = job.config.retryAttempts || 1;

    while (attempt < maxAttempts) {
      try {
        await job.task();
        
        const duration = Date.now() - startTime;
        job.status = "idle";
        job.errorCount = 0;
        
        console.log(`[CronService] ✓ Job ${name} completed successfully (${duration}ms)`);
        
        return {
          success: true,
          message: "Job completed successfully",
          duration,
        };
      } catch (error) {
        attempt++;
        job.errorCount++;
        
        console.error(`[CronService] ✗ Job ${name} failed (attempt ${attempt}/${maxAttempts}):`, error);

        if (attempt < maxAttempts) {
          const delay = job.config.retryDelay || 5000;
          console.log(`[CronService] Retrying job ${name} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          job.status = "error";
          const duration = Date.now() - startTime;
          
          return {
            success: false,
            message: `Job failed after ${maxAttempts} attempts`,
            duration,
            error: error as Error,
          };
        }
      }
    }

    return {
      success: false,
      message: "Unknown error",
      duration: Date.now() - startTime,
    };
  }

  /**
   * Development simulation mode (runs jobs on interval for testing)
   */
  private startSimulation(): void {
    console.log("[CronService] Running in SIMULATION mode (development)");
    console.log("[CronService] Jobs will be logged but not executed automatically");
    console.log("[CronService] Use cronService.executeJob(name) to manually trigger jobs");
    
    // Log registered jobs
    for (const [name, job] of this.jobs) {
      if (job.config.enabled) {
        console.log(`  - ${name}: ${job.config.schedule} (${job.config.description})`);
      }
    }
  }

  /**
   * Manually execute a job (useful for testing)
   */
  async runJob(name: string): Promise<JobResult> {
    console.log(`[CronService] Manually triggering job: ${name}`);
    return await this.executeJob(name);
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus(): Array<{ name: string; status: CronJob["status"]; lastRun?: Date; errorCount: number }> {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      status: job.status,
      lastRun: job.lastRun,
      errorCount: job.errorCount,
    }));
  }
}

// ============================================================================
// JOB IMPLEMENTATIONS
// ============================================================================

/**
 * Event Reminders Job
 * Sends reminders to members about upcoming events (within 24 hours)
 * Schedule: Daily at 8 AM ("0 8 * * *")
 */
export async function eventRemindersJob(): Promise<void> {
  console.log("[EventReminders] Starting event reminder job...");
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all events happening in the next 24 hours
  const upcomingEvents = await db.query.events.findMany({
    where: and(
      gte(schema.events.date, today),
      lte(schema.events.date, tomorrow)
    ),
  });

  console.log(`[EventReminders] Found ${upcomingEvents.length} upcoming events`);

  for (const event of upcomingEvents) {
    // Get all members who RSVP'd to this event
    const rsvps = await db.query.eventRsvps.findMany({
      where: and(
        eq(schema.eventRsvps.eventId, event.id),
        eq(schema.eventRsvps.status, "confirmed")
      ),
      with: {
        member: {
          with: {
            user: true
          }
        }
      }
    });

    console.log(`[EventReminders] Sending ${rsvps.length} reminders for event: ${event.title}`);

    for (const rsvp of rsvps) {
      const member = Array.isArray(rsvp.member) ? rsvp.member[0] : rsvp.member;
      const user = member?.user ? (Array.isArray(member.user) ? member.user[0] : member.user) : null;
      
      if (!user) continue;

      // Create notification
      await db.insert(schema.notifications).values({
        memberId: member.id,
        title: "Event Reminder",
        message: `Don't forget! ${event.title} is happening tomorrow at ${event.location}`,
        type: "event",
        actionUrl: `/events/${event.id}`,
      });

      // EMAIL INTEGRATION: Send email reminder
      // Uncomment when ready to send emails
      /*
      await emailService.sendEventReminder({
        email: user.email,
        firstName: user.firstName,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
      });
      */

      // SMS INTEGRATION: Send SMS reminder
      // Uncomment when ready to send SMS
      /*
      if (user.phone) {
        await smsService.sendEventReminderSMS(
          user.phone,
          event.title,
          event.date,
          event.location
        );
      }
      */

      console.log(`  ✓ Reminder sent to ${user.email}`);
    }
  }

  console.log("[EventReminders] Job completed");
}

/**
 * Dues Reminders Job
 * Sends payment reminders to members with pending dues
 * Schedule: 1st of every month ("0 0 1 * *")
 */
export async function duesRemindersJob(): Promise<void> {
  console.log("[DuesReminders] Starting dues reminder job...");

  // Get all pending dues
  const pendingDues = await db.query.membershipDues.findMany({
    where: eq(schema.membershipDues.paymentStatus, "pending"),
    with: {
      member: {
        with: {
          user: true
        }
      }
    }
  });

  console.log(`[DuesReminders] Found ${pendingDues.length} pending dues`);

  for (const due of pendingDues) {
    const member = Array.isArray(due.member) ? due.member[0] : due.member;
    const user = member?.user ? (Array.isArray(member.user) ? member.user[0] : member.user) : null;
    
    if (!user) continue;

    // Check if due date is approaching (within 7 days) or overdue
    const daysUntilDue = Math.ceil((due.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 7) {
      // Create notification
      await db.insert(schema.notifications).values({
        memberId: member.id,
        title: daysUntilDue > 0 ? "Dues Payment Reminder" : "Overdue Payment",
        message: daysUntilDue > 0 
          ? `Your membership dues of ₦${due.amount} are due in ${daysUntilDue} days`
          : `Your membership dues of ₦${due.amount} are overdue`,
        type: "dues_reminder",
        actionUrl: "/dues",
      });

      // EMAIL INTEGRATION
      /*
      await emailService.sendDuesReminder({
        email: user.email,
        firstName: user.firstName,
        amount: due.amount,
        dueDate: due.dueDate,
        paymentUrl: `${process.env.APP_URL}/dues`,
      });
      */

      // SMS INTEGRATION
      /*
      if (user.phone) {
        await smsService.sendDuesReminderSMS(
          user.phone,
          due.amount.toString(),
          due.dueDate
        );
      }
      */

      console.log(`  ✓ Reminder sent to ${user.email} (due in ${daysUntilDue} days)`);
    }
  }

  console.log("[DuesReminders] Job completed");
}

/**
 * Membership Renewals Job
 * Checks and notifies members about expiring memberships
 * Schedule: Every Sunday at midnight ("0 0 * * 0")
 */
export async function membershipRenewalsJob(): Promise<void> {
  console.log("[MembershipRenewals] Starting membership renewal check...");

  // Get all active members
  const members = await db.query.members.findMany({
    where: eq(schema.members.status, "active"),
    with: {
      user: true
    }
  });

  console.log(`[MembershipRenewals] Checking ${members.length} active members`);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let renewalCount = 0;

  for (const member of members) {
    const user = Array.isArray(member.user) ? member.user[0] : member.user;
    if (!user) continue;

    // Check if member joined over a year ago
    if (member.joinDate && member.joinDate <= oneYearAgo) {
      // Check if they have paid dues this year
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      
      const paidDues = await db.query.membershipDues.findFirst({
        where: and(
          eq(schema.membershipDues.memberId, member.id),
          eq(schema.membershipDues.paymentStatus, "completed"),
          gte(schema.membershipDues.paidAt, yearStart)
        )
      });

      if (!paidDues) {
        // Send renewal reminder
        await db.insert(schema.notifications).values({
          memberId: member.id,
          title: "Membership Renewal Required",
          message: "Your annual membership is up for renewal. Please renew to continue enjoying member benefits.",
          type: "dues_reminder",
          actionUrl: "/membership",
        });

        // EMAIL INTEGRATION
        /*
        await emailService.sendMembershipRenewalReminder({
          email: user.email,
          firstName: user.firstName,
          memberId: member.memberId,
          joinDate: member.joinDate,
        });
        */

        renewalCount++;
        console.log(`  ✓ Renewal reminder sent to ${user.email}`);
      }
    }
  }

  console.log(`[MembershipRenewals] Sent ${renewalCount} renewal reminders`);
}

/**
 * Election Notifications Job
 * Sends voting reminders during election periods
 * Schedule: Configurable based on election dates ("0 9,15,20 * * *" - 9 AM, 3 PM, 8 PM)
 */
export async function electionNotificationsJob(): Promise<void> {
  console.log("[ElectionNotifications] Starting election notification job...");

  const now = new Date();

  // Get all ongoing elections
  const ongoingElections = await db.query.elections.findMany({
    where: eq(schema.elections.status, "ongoing"),
  });

  console.log(`[ElectionNotifications] Found ${ongoingElections.length} ongoing elections`);

  for (const election of ongoingElections) {
    // Get members eligible to vote (based on location filters)
    let eligibleMembers;

    if (election.wardId) {
      eligibleMembers = await db.query.members.findMany({
        where: and(
          eq(schema.members.wardId, election.wardId),
          eq(schema.members.status, "active")
        ),
        with: { user: true }
      });
    } else if (election.lgaId) {
      eligibleMembers = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { 
          user: true,
          ward: {
            with: { lga: true }
          }
        }
      });
      eligibleMembers = eligibleMembers.filter(m => {
        const ward = Array.isArray(m.ward) ? m.ward[0] : m.ward;
        return ward?.lgaId === election.lgaId;
      });
    } else if (election.stateId) {
      eligibleMembers = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { 
          user: true,
          ward: {
            with: { 
              lga: {
                with: { state: true }
              }
            }
          }
        }
      });
      eligibleMembers = eligibleMembers.filter(m => {
        const ward = Array.isArray(m.ward) ? m.ward[0] : m.ward;
        const lga = ward?.lga ? (Array.isArray(ward.lga) ? ward.lga[0] : ward.lga) : null;
        return lga?.stateId === election.stateId;
      });
    } else {
      // National election - all active members
      eligibleMembers = await db.query.members.findMany({
        where: eq(schema.members.status, "active"),
        with: { user: true }
      });
    }

    console.log(`[ElectionNotifications] ${eligibleMembers.length} eligible voters for: ${election.title}`);

    for (const member of eligibleMembers) {
      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      if (!user) continue;

      // Check if member has already voted
      const hasVoted = await db.query.votes.findFirst({
        where: and(
          eq(schema.votes.electionId, election.id),
          eq(schema.votes.voterId, member.id)
        )
      });

      if (!hasVoted) {
        // Calculate hours remaining
        const hoursRemaining = Math.ceil((election.endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        await db.insert(schema.notifications).values({
          memberId: member.id,
          title: "Election Reminder",
          message: `Don't forget to vote! ${election.title} ends in ${hoursRemaining} hours.`,
          type: "election",
          actionUrl: `/elections/${election.id}`,
        });

        // EMAIL INTEGRATION
        /*
        await emailService.sendElectionReminder({
          email: user.email,
          firstName: user.firstName,
          electionTitle: election.title,
          endDate: election.endDate,
        });
        */

        console.log(`  ✓ Voting reminder sent to ${user.email}`);
      }
    }
  }

  console.log("[ElectionNotifications] Job completed");
}

/**
 * Inactive Member Cleanup Job
 * Flags members who have been inactive for 90+ days
 * Schedule: 1st of every month at 2 AM ("0 2 1 * *")
 */
export async function inactiveMemberCleanupJob(): Promise<void> {
  console.log("[InactiveMemberCleanup] Starting inactive member cleanup...");

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get all active members
  const activeMembers = await db.query.members.findMany({
    where: eq(schema.members.status, "active"),
    with: { user: true }
  });

  console.log(`[InactiveMemberCleanup] Checking ${activeMembers.length} active members`);

  let inactiveCount = 0;

  for (const member of activeMembers) {
    // Check for any recent activity (votes, RSVPs, task completions, etc.)
    const [
      recentVotes,
      recentRsvps,
      recentTasks,
      recentCampaignVotes,
      recentQuizzes
    ] = await Promise.all([
      db.query.votes.findFirst({
        where: and(
          eq(schema.votes.voterId, member.id),
          gte(schema.votes.castedAt, ninetyDaysAgo)
        )
      }),
      db.query.eventRsvps.findFirst({
        where: and(
          eq(schema.eventRsvps.memberId, member.id),
          gte(schema.eventRsvps.rsvpedAt, ninetyDaysAgo)
        )
      }),
      db.query.taskCompletions.findFirst({
        where: and(
          eq(schema.taskCompletions.memberId, member.id),
          gte(schema.taskCompletions.completedAt, ninetyDaysAgo)
        )
      }),
      db.query.campaignVotes.findFirst({
        where: and(
          eq(schema.campaignVotes.memberId, member.id),
          gte(schema.campaignVotes.votedAt, ninetyDaysAgo)
        )
      }),
      db.query.quizAttempts.findFirst({
        where: and(
          eq(schema.quizAttempts.memberId, member.id),
          gte(schema.quizAttempts.attemptedAt, ninetyDaysAgo)
        )
      })
    ]);

    const hasRecentActivity = recentVotes || recentRsvps || recentTasks || recentCampaignVotes || recentQuizzes;

    if (!hasRecentActivity) {
      const user = Array.isArray(member.user) ? member.user[0] : member.user;
      
      // Create notification for inactive member
      await db.insert(schema.notifications).values({
        memberId: member.id,
        title: "We Miss You!",
        message: "We noticed you haven't been active recently. Check out what's new in APC Connect!",
        type: "engagement",
        actionUrl: "/home",
      });

      // EMAIL INTEGRATION: Send re-engagement email
      /*
      if (user) {
        await emailService.sendReEngagementEmail({
          email: user.email,
          firstName: user.firstName,
          lastActiveDate: member.joinDate, // Or track actual last activity
        });
      }
      */

      inactiveCount++;
      console.log(`  ⚠ Inactive member flagged: ${user?.email || member.memberId}`);
    }
  }

  console.log(`[InactiveMemberCleanup] Flagged ${inactiveCount} inactive members`);
}

/**
 * Analytics Aggregation Job
 * Calculates and caches daily statistics for performance
 * Schedule: Daily at midnight ("0 0 * * *")
 */
export async function analyticsAggregationJob(): Promise<void> {
  console.log("[AnalyticsAggregation] Starting analytics aggregation...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Calculate key metrics
    const [
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalDonations,
      totalVotes,
      totalTasks,
      totalCampaigns
    ] = await Promise.all([
      db.$count(schema.members),
      db.$count(schema.members, eq(schema.members.status, "active")),
      db.$count(schema.events),
      db.$count(schema.events, gte(schema.events.date, today)),
      db.select({ total: sql<number>`COALESCE(SUM(${schema.donations.amount}), 0)` })
        .from(schema.donations)
        .where(eq(schema.donations.paymentStatus, "completed")),
      db.$count(schema.votes),
      db.$count(schema.taskCompletions, eq(schema.taskCompletions.status, "approved")),
      db.$count(schema.issueCampaigns)
    ]);

    const analytics = {
      date: today,
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalDonations: totalDonations[0]?.total || 0,
      totalVotes,
      totalTasks,
      totalCampaigns,
      calculatedAt: new Date(),
    };

    console.log("[AnalyticsAggregation] Calculated metrics:", analytics);

    // Store in cache or dedicated analytics table
    // For now, just log the results
    // In production, you might want to:
    // 1. Store in Redis for fast access
    // 2. Create a dailyAnalytics table
    // 3. Update a materialized view

    /*
    // Example: Store in Redis
    await redis.setex(
      `analytics:daily:${today.toISOString().split('T')[0]}`,
      86400, // 24 hours
      JSON.stringify(analytics)
    );
    */

    console.log("[AnalyticsAggregation] Job completed successfully");
  } catch (error) {
    console.error("[AnalyticsAggregation] Error:", error);
    throw error;
  }
}

// ============================================================================
// CRON SERVICE SINGLETON & INITIALIZATION
// ============================================================================

/**
 * Singleton instance of CronService
 */
export const cronService = new CronService();

/**
 * Initialize and register all cron jobs
 */
export function initializeCronJobs(): void {
  console.log("[CronService] Initializing cron jobs...");

  // Register all scheduled jobs
  cronService.registerJob(
    "event-reminders",
    "0 8 * * *", // Daily at 8 AM
    eventRemindersJob,
    {
      description: "Send reminders for events happening within 24 hours",
      enabled: true,
    }
  );

  cronService.registerJob(
    "dues-reminders",
    "0 0 1 * *", // 1st of every month at midnight
    duesRemindersJob,
    {
      description: "Send payment reminders to members with pending dues",
      enabled: true,
    }
  );

  cronService.registerJob(
    "membership-renewals",
    "0 0 * * 0", // Every Sunday at midnight
    membershipRenewalsJob,
    {
      description: "Check and notify members about expiring memberships",
      enabled: true,
    }
  );

  cronService.registerJob(
    "election-notifications",
    "0 9,15,20 * * *", // 9 AM, 3 PM, 8 PM daily
    electionNotificationsJob,
    {
      description: "Send voting reminders during election periods",
      enabled: true,
    }
  );

  cronService.registerJob(
    "inactive-member-cleanup",
    "0 2 1 * *", // 1st of every month at 2 AM
    inactiveMemberCleanupJob,
    {
      description: "Flag members inactive for 90+ days",
      enabled: true,
    }
  );

  cronService.registerJob(
    "analytics-aggregation",
    "0 0 * * *", // Daily at midnight
    analyticsAggregationJob,
    {
      description: "Calculate and cache daily statistics",
      enabled: true,
    }
  );

  console.log("[CronService] All jobs registered successfully");
}

// ============================================================================
// CRON SCHEDULE PATTERNS REFERENCE
// ============================================================================

/*
CRON PATTERN FORMAT: * * * * * (minute hour day month weekday)

┌────────────── minute (0 - 59)
│ ┌──────────── hour (0 - 23)
│ │ ┌────────── day of month (1 - 31)
│ │ │ ┌──────── month (1 - 12)
│ │ │ │ ┌────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *

COMMON PATTERNS:

Every minute:              * * * * *
Every 5 minutes:           * /5 * * * *
Every 15 minutes:          * /15 * * * *
Every 30 minutes:          * /30 * * * *
Every hour:                0 * * * *
Every 2 hours:             0 * /2 * * *
Every day at midnight:     0 0 * * *
Every day at 8 AM:         0 8 * * *
Every day at noon:         0 12 * * *
Every Sunday at midnight:  0 0 * * 0
Every Monday at 9 AM:      0 9 * * 1
Weekdays at 8 AM:          0 8 * * 1-5
1st of month at midnight:  0 0 1 * *
Last day of month:         0 0 L * * (depends on library)
Every quarter:             0 0 1 * /3 *

TIMEZONE HANDLING:
- Set timezone in job config: { timezone: 'Africa/Lagos' }
- Nigeria is in WAT (West Africa Time) - UTC+1
- No daylight saving time adjustments needed
*/
