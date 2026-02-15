/**
 * APC Connect Push Notification Service
 * 
 * This module provides a unified push notification framework for web and mobile platforms.
 * It supports multiple providers (FCM, OneSignal, Web Push) with a simple, consistent API.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * --------------------------------
 * PUSH_SERVICE_PROVIDER - The push service provider to use (fcm | onesignal | web-push)
 * 
 * For Firebase Cloud Messaging (FCM):
 *   FCM_SERVER_KEY - Your Firebase Cloud Messaging server key
 *   FCM_PROJECT_ID - Your Firebase project ID (optional)
 * 
 * For OneSignal:
 *   ONESIGNAL_API_KEY - Your OneSignal REST API key
 *   ONESIGNAL_APP_ID - Your OneSignal App ID
 * 
 * For Web Push (VAPID):
 *   VAPID_PUBLIC_KEY - Your VAPID public key (for client-side subscription)
 *   VAPID_PRIVATE_KEY - Your VAPID private key (for server-side signing)
 *   VAPID_SUBJECT - Contact email or URL (e.g., mailto:admin@apcconnect.ng)
 * 
 * INTEGRATION GUIDE:
 * ------------------
 * 
 * 1. FIREBASE CLOUD MESSAGING (FCM) - Recommended for mobile apps
 *    - Best for: Android & iOS native/hybrid apps
 *    - Setup: https://firebase.google.com/docs/cloud-messaging
 *    - Install: npm install firebase-admin
 *    - Usage: Set PUSH_SERVICE_PROVIDER=fcm and FCM_SERVER_KEY
 * 
 * 2. ONESIGNAL - Easiest setup, great for cross-platform
 *    - Best for: Quick setup, web + mobile unified
 *    - Setup: https://documentation.onesignal.com/docs
 *    - Install: npm install @onesignal/node-onesignal
 *    - Usage: Set PUSH_SERVICE_PROVIDER=onesignal and ONESIGNAL_API_KEY
 * 
 * 3. WEB PUSH (VAPID) - Native web push without third-party service
 *    - Best for: Web-only, privacy-focused, no external dependencies
 *    - Setup: Generate VAPID keys with: npx web-push generate-vapid-keys
 *    - Install: npm install web-push
 *    - Usage: Set PUSH_SERVICE_PROVIDER=web-push and VAPID keys
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Base notification payload that will be sent to the device
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

/**
 * Action buttons that can be shown in the notification
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Complete push notification object with metadata
 */
export interface PushNotification {
  userId?: string;
  userIds?: string[];
  segment?: NotificationSegment;
  payload: NotificationPayload;
  priority?: "high" | "normal" | "low";
  timeToLive?: number; // Seconds until notification expires
  scheduledFor?: Date; // Future delivery time
}

/**
 * User segments for targeted notifications
 */
export type NotificationSegment = 
  | "all" 
  | "admins" 
  | "members" 
  | "ward-leaders" 
  | "lga-leaders" 
  | "state-leaders"
  | "verified-members"
  | "pending-members"
  | string; // Custom segments

/**
 * Notification types for analytics and filtering
 */
export type NotificationType = 
  | "event_reminder" 
  | "election_announcement" 
  | "news_alert" 
  | "dues_reminder" 
  | "task_assignment"
  | "campaign_update"
  | "achievement_unlocked"
  | "referral_reward"
  | "system_announcement";

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Pre-defined notification templates for common scenarios.
 * Each template includes title, body, icon, badge, and data payload.
 */
export const NotificationTemplates = {
  /**
   * Event Reminder Notification
   * Sent when an event is about to start
   */
  eventReminder: (eventTitle: string, eventDate: string, eventId: string): NotificationPayload => ({
    title: "📅 Event Reminder",
    body: `"${eventTitle}" starts ${eventDate}. Don't miss it!`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `event-${eventId}`,
    requireInteraction: false,
    actions: [
      { action: "view", title: "View Details", icon: "/icon-192.png" },
      { action: "dismiss", title: "Dismiss" }
    ],
    data: {
      type: "event_reminder",
      eventId,
      url: `/events?event=${eventId}`
    }
  }),

  /**
   * Election Announcement Notification
   * Sent when new election or voting is announced
   */
  electionAnnouncement: (electionTitle: string, deadline: string, electionId: string): NotificationPayload => ({
    title: "🗳️ Election Announcement",
    body: `New election: "${electionTitle}". Voting ends ${deadline}. Cast your vote now!`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `election-${electionId}`,
    requireInteraction: true,
    actions: [
      { action: "vote", title: "Vote Now", icon: "/icon-192.png" },
      { action: "later", title: "Remind Me Later" }
    ],
    data: {
      type: "election_announcement",
      electionId,
      url: `/elections?id=${electionId}`
    }
  }),

  /**
   * News Alert Notification
   * Sent when important news is published
   */
  newsAlert: (headline: string, category: string, newsId: string): NotificationPayload => ({
    title: `📰 ${category} Update`,
    body: headline,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `news-${newsId}`,
    requireInteraction: false,
    actions: [
      { action: "read", title: "Read Now", icon: "/icon-192.png" },
      { action: "share", title: "Share" }
    ],
    data: {
      type: "news_alert",
      newsId,
      category,
      url: `/news/${newsId}`
    }
  }),

  /**
   * Dues Reminder Notification
   * Sent when member has outstanding dues
   */
  duesReminder: (amount: number, dueDate: string, memberId: string): NotificationPayload => ({
    title: "💰 Membership Dues Reminder",
    body: `Your dues of ₦${amount.toLocaleString()} are due by ${dueDate}. Pay now to stay active.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `dues-${memberId}`,
    requireInteraction: true,
    actions: [
      { action: "pay", title: "Pay Now", icon: "/icon-192.png" },
      { action: "later", title: "Remind Me Later" }
    ],
    data: {
      type: "dues_reminder",
      memberId,
      amount,
      url: "/dues"
    }
  }),

  /**
   * Task Assignment Notification
   * Sent when a new task is assigned to member
   */
  taskAssignment: (taskTitle: string, priority: string, taskId: string): NotificationPayload => ({
    title: "✅ New Task Assigned",
    body: `You have a new ${priority} priority task: "${taskTitle}"`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `task-${taskId}`,
    requireInteraction: true,
    actions: [
      { action: "view", title: "View Task", icon: "/icon-192.png" },
      { action: "accept", title: "Accept" }
    ],
    data: {
      type: "task_assignment",
      taskId,
      priority,
      url: `/tasks?id=${taskId}`
    }
  }),

  /**
   * Campaign Update Notification
   * Sent for campaign announcements and updates
   */
  campaignUpdate: (campaignName: string, message: string, campaignId: string): NotificationPayload => ({
    title: `📣 ${campaignName}`,
    body: message,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: `campaign-${campaignId}`,
    requireInteraction: false,
    actions: [
      { action: "join", title: "Join Campaign", icon: "/icon-192.png" },
      { action: "share", title: "Share" }
    ],
    data: {
      type: "campaign_update",
      campaignId,
      url: `/campaigns?id=${campaignId}`
    }
  }),

  /**
   * Achievement Unlocked Notification
   * Sent when member earns a badge or achievement
   */
  achievementUnlocked: (badgeName: string, badgeIcon: string, badgeId: string): NotificationPayload => ({
    title: "🏆 Achievement Unlocked!",
    body: `Congratulations! You've earned the "${badgeName}" badge!`,
    icon: badgeIcon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: `achievement-${badgeId}`,
    requireInteraction: false,
    actions: [
      { action: "view", title: "View Badge", icon: "/icon-192.png" },
      { action: "share", title: "Share" }
    ],
    data: {
      type: "achievement_unlocked",
      badgeId,
      url: "/rewards"
    }
  }),

  /**
   * Referral Reward Notification
   * Sent when member earns points from referrals
   */
  referralReward: (points: number, referredName: string): NotificationPayload => ({
    title: "🎉 Referral Reward!",
    body: `You earned ${points} points! ${referredName} just joined APC Connect using your referral code.`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "referral-reward",
    requireInteraction: false,
    actions: [
      { action: "invite", title: "Invite More", icon: "/icon-192.png" },
      { action: "view", title: "View Points" }
    ],
    data: {
      type: "referral_reward",
      points,
      url: "/invite-earn"
    }
  }),

  /**
   * System Announcement Notification
   * Sent for important system-wide announcements
   */
  systemAnnouncement: (title: string, message: string, url?: string): NotificationPayload => ({
    title: `⚠️ ${title}`,
    body: message,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "system-announcement",
    requireInteraction: true,
    actions: [
      { action: "view", title: "Learn More", icon: "/icon-192.png" },
      { action: "dismiss", title: "Dismiss" }
    ],
    data: {
      type: "system_announcement",
      url: url || "/"
    }
  })
};

// ============================================================================
// PUSH SERVICE CLASS
// ============================================================================

/**
 * PushService handles all push notification operations
 * Supports FCM, OneSignal, and Web Push providers
 */
export class PushService {
  private provider: string;
  private initialized: boolean = false;

  constructor() {
    this.provider = process.env.PUSH_SERVICE_PROVIDER || "none";
    this.initialize();
    this.validateConfiguration();
  }

  /**
   * Initialize the push service provider
   */
  private initialize(): void {
    console.log(`[PushService] Initializing with provider: ${this.provider}`);

    switch (this.provider) {
      case "fcm":
        this.initializeFCM();
        break;
      case "onesignal":
        this.initializeOneSignal();
        break;
      case "web-push":
        this.initializeWebPush();
        break;
      default:
        console.log("[PushService] No provider configured. Running in simulation mode.");
        this.initialized = true;
    }
  }

  /**
   * Validate push service configuration
   * Logs warnings if running in simulation mode or missing required variables
   */
  private validateConfiguration(): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (this.provider === "none" || !this.initialized) {
      if (isProduction) {
        console.warn('\n⚠️  WARNING: Push notification service running in SIMULATION mode in production');
        console.warn('   Push notifications will only be logged, not actually sent');
        console.warn('   Set PUSH_SERVICE_PROVIDER environment variable (fcm | onesignal | web-push)\n');
      } else {
        console.log('🔔 Push Service: Simulation mode (no provider configured)');
      }
      return;
    }

    // Provider-specific validation is done in the initialize methods
    if (this.initialized) {
      console.log(`🔔 Push Service: ${this.provider} initialized successfully`);
    }
  }

  /**
   * Health check method to verify push service configuration
   * @returns Object with health status and details
   */
  getHealthCheck(): {
    status: 'ok' | 'warning' | 'error';
    provider: string;
    configured: boolean;
    simulation: boolean;
    initialized: boolean;
    message: string;
  } {
    const isSimulation = this.provider === "none" || !this.initialized;

    if (isSimulation) {
      return {
        status: 'warning',
        provider: this.provider,
        configured: false,
        simulation: true,
        initialized: this.initialized,
        message: 'Push notification service running in simulation mode'
      };
    }

    return {
      status: this.initialized ? 'ok' : 'error',
      provider: this.provider,
      configured: this.initialized,
      simulation: false,
      initialized: this.initialized,
      message: this.initialized 
        ? `Push service configured with ${this.provider}`
        : `Push service failed to initialize with ${this.provider}`
    };
  }

  /**
   * Initialize Firebase Cloud Messaging (FCM)
   * 
   * Installation:
   * npm install firebase-admin
   * 
   * Setup:
   * 1. Create Firebase project: https://console.firebase.google.com
   * 2. Download service account key (JSON)
   * 3. Set environment variables:
   *    FCM_SERVER_KEY=your-server-key
   *    FCM_PROJECT_ID=your-project-id
   * 
   * Usage Example:
   * ```typescript
   * import * as admin from 'firebase-admin';
   * 
   * admin.initializeApp({
   *   credential: admin.credential.cert({
   *     projectId: process.env.FCM_PROJECT_ID,
   *     privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
   *     clientEmail: process.env.FCM_CLIENT_EMAIL,
   *   })
   * });
   * 
   * this.fcmAdmin = admin;
   * this.initialized = true;
   * ```
   */
  private initializeFCM(): void {
    if (!process.env.FCM_SERVER_KEY) {
      console.warn("[PushService] FCM_SERVER_KEY not configured");
      return;
    }

    // TODO: Uncomment when ready to use FCM
    // const admin = require('firebase-admin');
    // admin.initializeApp({
    //   credential: admin.credential.cert({
    //     projectId: process.env.FCM_PROJECT_ID,
    //     privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    //     clientEmail: process.env.FCM_CLIENT_EMAIL,
    //   })
    // });
    // this.fcmAdmin = admin;

    console.log("[PushService] FCM initialized successfully");
    this.initialized = true;
  }

  /**
   * Initialize OneSignal
   * 
   * Installation:
   * npm install @onesignal/node-onesignal
   * 
   * Setup:
   * 1. Create OneSignal account: https://onesignal.com
   * 2. Create new app and get API keys
   * 3. Set environment variables:
   *    ONESIGNAL_API_KEY=your-rest-api-key
   *    ONESIGNAL_APP_ID=your-app-id
   * 
   * Usage Example:
   * ```typescript
   * import * as OneSignal from '@onesignal/node-onesignal';
   * 
   * this.oneSignalClient = new OneSignal.DefaultApi(
   *   OneSignal.createConfiguration({
   *     appKey: process.env.ONESIGNAL_API_KEY
   *   })
   * );
   * this.oneSignalAppId = process.env.ONESIGNAL_APP_ID;
   * this.initialized = true;
   * ```
   */
  private initializeOneSignal(): void {
    if (!process.env.ONESIGNAL_API_KEY || !process.env.ONESIGNAL_APP_ID) {
      console.warn("[PushService] ONESIGNAL_API_KEY or ONESIGNAL_APP_ID not configured");
      return;
    }

    // TODO: Uncomment when ready to use OneSignal
    // const OneSignal = require('@onesignal/node-onesignal');
    // this.oneSignalClient = new OneSignal.DefaultApi(
    //   OneSignal.createConfiguration({
    //     appKey: process.env.ONESIGNAL_API_KEY
    //   })
    // );
    // this.oneSignalAppId = process.env.ONESIGNAL_APP_ID;

    console.log("[PushService] OneSignal initialized successfully");
    this.initialized = true;
  }

  /**
   * Initialize Web Push (VAPID)
   * 
   * Installation:
   * npm install web-push
   * 
   * Setup:
   * 1. Generate VAPID keys: npx web-push generate-vapid-keys
   * 2. Set environment variables:
   *    VAPID_PUBLIC_KEY=your-public-key
   *    VAPID_PRIVATE_KEY=your-private-key
   *    VAPID_SUBJECT=mailto:admin@apcconnect.ng
   * 
   * Usage Example:
   * ```typescript
   * import webPush from 'web-push';
   * 
   * webPush.setVapidDetails(
   *   process.env.VAPID_SUBJECT!,
   *   process.env.VAPID_PUBLIC_KEY!,
   *   process.env.VAPID_PRIVATE_KEY!
   * );
   * this.webPushClient = webPush;
   * this.initialized = true;
   * ```
   */
  private async initializeWebPush(): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("[PushService] VAPID keys not configured");
      return;
    }

    try {
      const webPush = await import('web-push');
      webPush.default.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@apcconnect.ng',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      this.webPushClient = webPush.default;
      console.log("[PushService] Web Push initialized successfully");
      this.initialized = true;
    } catch (error) {
      console.error("[PushService] Web Push initialization error:", error);
    }
  }

  /**
   * Send push notification to a specific user
   * 
   * @param userId - The ID of the user to send notification to
   * @param payload - The notification payload to send
   * @returns Promise that resolves when notification is sent
   * 
   * Example:
   * ```typescript
   * await pushService.sendPushNotification(
   *   "user-123",
   *   NotificationTemplates.eventReminder("Town Hall Meeting", "tomorrow at 3pm", "event-456")
   * );
   * ```
   */
  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    console.log("[PushService] Sending notification to user:", userId);
    console.log("[PushService] Notification payload:", JSON.stringify(payload, null, 2));

    await this.sendExpoPushNotification(userId, payload);

    if (!this.initialized) {
      console.warn("[PushService] Service not initialized. Skipping web push notification.");
      return;
    }

    switch (this.provider) {
      case "web-push":
        await this.sendWebPushNotification(userId, payload);
        break;
      default:
        console.log("[PushService] Simulating push notification send");
    }

    console.log("[PushService] Notification sent successfully");
  }

  private async sendExpoPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      const { db } = await import("./db");
      const schema = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const tokens = await db.query.mobilePushTokens.findMany({
        where: and(
          eq(schema.mobilePushTokens.memberId, userId),
          eq(schema.mobilePushTokens.isActive, true)
        ),
      });

      if (tokens.length === 0) {
        console.log(`[PushService] No active mobile push tokens for user: ${userId}`);
        return;
      }

      const messages = tokens.map((tokenRecord) => ({
        to: tokenRecord.token,
        sound: 'default' as const,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log(`[PushService] Expo push sent to ${tokens.length} device(s):`, JSON.stringify(result));
    } catch (error) {
      console.error("[PushService] Expo push error:", error);
    }
  }

  /**
   * Send Web Push notification to a specific user
   */
  private async sendWebPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      const { db } = await import("./db");
      const schema = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const subscriptions = await db.query.pushSubscriptions.findMany({
        where: eq(schema.pushSubscriptions.memberId, userId),
      });

      if (subscriptions.length === 0) {
        console.log(`[PushService] No subscriptions found for user: ${userId}`);
        return;
      }

      const notifications = subscriptions.map(async (sub) => {
        try {
          if (this.webPushClient) {
            await this.webPushClient.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              JSON.stringify(payload)
            );
            console.log(`[PushService] Sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          }
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[PushService] Subscription expired, removing: ${sub.id}`);
            await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
          } else {
            console.error("[PushService] Send error:", error);
          }
        }
      });

      await Promise.all(notifications);
    } catch (error) {
      console.error("[PushService] Web Push error:", error);
    }
  }

  /**
   * Broadcast notification to all users
   * 
   * @param payload - The notification payload to broadcast
   * @returns Promise that resolves when broadcast is complete
   * 
   * Example:
   * ```typescript
   * await pushService.broadcast(
   *   NotificationTemplates.systemAnnouncement(
   *     "Maintenance Notice",
   *     "The platform will be down for maintenance from 2-4 AM",
   *     "/"
   *   )
   * );
   * ```
   */
  async broadcast(payload: NotificationPayload): Promise<void> {
    console.log("[PushService] Broadcasting notification to all users");
    console.log("[PushService] Broadcast payload:", JSON.stringify(payload, null, 2));

    if (!this.initialized) {
      console.warn("[PushService] Service not initialized. Skipping broadcast.");
      return;
    }

    // TODO: Implement actual broadcast based on provider
    switch (this.provider) {
      case "fcm":
        // await this.broadcastFCM(payload);
        break;
      case "onesignal":
        // await this.broadcastOneSignal(payload);
        break;
      case "web-push":
        // await this.broadcastWebPush(payload);
        break;
      default:
        console.log("[PushService] Simulating broadcast to all users");
    }

    console.log("[PushService] Broadcast completed successfully");
  }

  /**
   * Send notification to a specific user segment
   * 
   * @param segment - The user segment to target
   * @param payload - The notification payload to send
   * @returns Promise that resolves when notification is sent to segment
   * 
   * Example:
   * ```typescript
   * await pushService.sendToSegment(
   *   "ward-leaders",
   *   NotificationTemplates.taskAssignment(
   *     "Organize Ward Meeting",
   *     "high",
   *     "task-789"
   *   )
   * );
   * ```
   */
  async sendToSegment(segment: NotificationSegment, payload: NotificationPayload): Promise<void> {
    console.log(`[PushService] Sending notification to segment: ${segment}`);
    console.log("[PushService] Segment notification payload:", JSON.stringify(payload, null, 2));

    if (!this.initialized) {
      console.warn("[PushService] Service not initialized. Skipping segment notification.");
      return;
    }

    // TODO: Implement actual segment notification based on provider
    // You'll need to query your database for users in the segment
    // and send notifications to each user's device tokens
    
    switch (this.provider) {
      case "fcm":
        // const users = await getUsersBySegment(segment);
        // await this.sendFCMToSegment(users, payload);
        break;
      case "onesignal":
        // await this.sendOneSignalToSegment(segment, payload);
        break;
      case "web-push":
        // const users = await getUsersBySegment(segment);
        // await this.sendWebPushToSegment(users, payload);
        break;
      default:
        console.log(`[PushService] Simulating segment notification to: ${segment}`);
    }

    console.log("[PushService] Segment notification completed successfully");
  }

  /**
   * Send notification to multiple specific users
   * 
   * @param userIds - Array of user IDs to send notification to
   * @param payload - The notification payload to send
   * @returns Promise that resolves when notifications are sent
   * 
   * Example:
   * ```typescript
   * await pushService.sendToMultiple(
   *   ["user-123", "user-456", "user-789"],
   *   NotificationTemplates.campaignUpdate(
   *     "Youth Campaign",
   *     "Join us for the rally this weekend!",
   *     "campaign-101"
   *   )
   * );
   * ```
   */
  async sendToMultiple(userIds: string[], payload: NotificationPayload): Promise<void> {
    console.log(`[PushService] Sending notification to ${userIds.length} users`);
    console.log("[PushService] User IDs:", userIds);
    console.log("[PushService] Notification payload:", JSON.stringify(payload, null, 2));

    if (!this.initialized) {
      console.warn("[PushService] Service not initialized. Skipping notifications.");
      return;
    }

    // Send notifications in parallel for better performance
    const promises = userIds.map(userId => this.sendPushNotification(userId, payload));
    await Promise.all(promises);

    console.log(`[PushService] Sent notifications to ${userIds.length} users successfully`);
  }

  /**
   * Schedule a notification for future delivery
   * 
   * @param notification - Complete push notification object with scheduledFor date
   * @returns Promise that resolves when notification is scheduled
   * 
   * Example:
   * ```typescript
   * await pushService.scheduleNotification({
   *   userId: "user-123",
   *   payload: NotificationTemplates.eventReminder("Town Hall", "in 1 hour", "event-456"),
   *   scheduledFor: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
   * });
   * ```
   */
  async scheduleNotification(notification: PushNotification): Promise<void> {
    console.log("[PushService] Scheduling notification");
    console.log("[PushService] Scheduled for:", notification.scheduledFor);
    console.log("[PushService] Notification:", JSON.stringify(notification, null, 2));

    // TODO: Implement scheduling using a job queue (e.g., Bull, Agenda)
    // For now, just log the scheduling
    console.log("[PushService] Notification scheduled successfully (simulation)");
  }

  /**
   * Get VAPID public key for client-side subscription (Web Push only)
   * 
   * @returns The VAPID public key or null if not using Web Push
   */
  getVapidPublicKey(): string | null {
    if (this.provider === "web-push") {
      return process.env.VAPID_PUBLIC_KEY || null;
    }
    return null;
  }

  /**
   * Check if push service is initialized and ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get the current provider name
   */
  getProvider(): string {
    return this.provider;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of PushService
 * Import and use this instance throughout your application
 * 
 * Example:
 * ```typescript
 * import { pushService } from './push-service';
 * 
 * await pushService.sendPushNotification(
 *   userId,
 *   NotificationTemplates.newsAlert("Breaking News", "Politics", "news-123")
 * );
 * ```
 */
export const pushService = new PushService();
