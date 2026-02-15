import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb, decimal, doublePrecision, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const membershipStatusEnum = pgEnum("membership_status", ["active", "pending", "expired", "suspended", "deleted"]);
export const electionStatusEnum = pgEnum("election_status", ["upcoming", "ongoing", "completed"]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["low", "medium", "high"]);
export const pollingUnitStatusEnum = pgEnum("polling_unit_status", ["active", "delayed", "completed", "incident"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "approved", "completed", "rejected"]);
export const taskDifficultyEnum = pgEnum("task_difficulty", ["Easy", "Medium", "Hard"]);
export const taskCategoryEnum = pgEnum("task_category", [
  "outreach", "canvassing", "social_media", "community_service",
  "data_collection", "education", "event_support", "fundraising",
  "monitoring", "content_creation", "membership_drive", "general"
]);
export const taskScopeEnum = pgEnum("task_scope", ["national", "state", "lga", "ward"]);
export const ideaStatusEnum = pgEnum("idea_status", ["pending", "under_review", "approved", "rejected", "implemented"]);
export const voteTypeEnum = pgEnum("vote_type", ["upvote", "downvote"]);
export const donationCategoryEnum = pgEnum("donation_category", ["general", "campaign", "infrastructure", "youth_programs", "community_development", "emergency_relief"]);
export const donationCampaignStatusEnum = pgEnum("donation_campaign_status", ["active", "paused", "completed", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["monthly", "quarterly", "yearly"]);
export const recurringStatusEnum = pgEnum("recurring_status", ["active", "paused", "cancelled"]);
export const achievementRarityEnum = pgEnum("achievement_rarity", ["bronze", "silver", "gold", "platinum"]);
export const badgeCategoryEnum = pgEnum("badge_category", ["tasks", "events", "quizzes", "campaigns", "ideas", "engagement", "points", "special"]);
export const quizDifficultyEnum = pgEnum("quiz_difficulty", ["easy", "medium", "hard"]);

// Nigerian Administrative Structure
export const states = pgTable("states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // e.g., "LAG" for Lagos
  region: text("region"), // e.g., "Southwest", "Southeast", "North-Central"
  capital: text("capital"), // e.g., "Ikeja" for Lagos
  createdAt: timestamp("created_at").defaultNow(),
});

export const lgas = pgTable("lgas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateId: varchar("state_id").notNull().references(() => states.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Add unique constraint on stateId + name combination
  uniqueLGAPerState: unique().on(table.stateId, table.name),
}));

export const wards = pgTable("wards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgaId: varchar("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  wardNumber: integer("ward_number"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Add unique constraint on lgaId + name combination
  uniqueWardPerLGA: unique().on(table.lgaId, table.name),
}));

// Electoral System
export const senatorialDistricts = pgTable("senatorial_districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // AB-SD1, AB-SD2, etc.
  stateId: varchar("state_id").notNull().references(() => states.id),
  districtName: text("district_name").notNull(), // "Abia Central"
  createdAt: timestamp("created_at").defaultNow(),
});

export const electoralStats = pgTable("electoral_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull(),
  totalRegisteredVoters: integer("total_registered_voters"),
  maleVoters: integer("male_voters"),
  femaleVoters: integer("female_voters"),
  pwdVoters: integer("pwd_voters"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const regionalElectoralStats = pgTable("regional_electoral_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statsId: varchar("stats_id").references(() => electoralStats.id),
  region: text("region").notNull(),
  voters: integer("voters"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users & Authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").default("member"), // member, coordinator, admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
  initiatedBy: varchar("initiated_by").references(() => users.id),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

// Members & Membership
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  memberId: text("member_id").notNull().unique(), // e.g., APC-2024-NG-12345
  nin: text("nin"), // National Identification Number
  ninVerified: boolean("nin_verified").default(false), // NIN verification status
  ninVerificationAttempts: integer("nin_verification_attempts").default(0), // Number of verification attempts
  ninVerifiedAt: timestamp("nin_verified_at"), // Timestamp when NIN was verified
  photoUrl: text("photo_url"), // Member photo for ID card
  wardId: varchar("ward_id").notNull().references(() => wards.id),
  status: membershipStatusEnum("status").default("pending"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by").references(() => users.id),
  suspensionReason: text("suspension_reason"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletionReason: text("deletion_reason"),
  joinDate: timestamp("join_date").defaultNow(),
  interests: jsonb("interests").$type<string[]>(), // ["education", "jobs", "security"]
  referralCode: text("referral_code").unique(), // Unique code for this member to share
  referredBy: varchar("referred_by").references((): any => members.id), // Who referred this member
});

export const membershipDues = pgTable("membership_dues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // "paystack", "offline"
  paystackReference: text("paystack_reference"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recurringMembershipDues = pgTable("recurring_membership_dues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: recurringFrequencyEnum("frequency").notNull(), // monthly, quarterly, yearly
  status: recurringStatusEnum("status").default("active"), // active, paused, cancelled
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  lastPaymentDate: timestamp("last_payment_date"),
  paystackAuthorizationCode: text("paystack_authorization_code"), // For automatic charging
  paystackCustomerCode: text("paystack_customer_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const memberIdCards = pgTable("member_id_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  lastGeneratedAt: timestamp("last_generated_at").defaultNow(),
  generatedByUserId: varchar("generated_by_user_id").references(() => users.id),
  signatureNonce: text("signature_nonce").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const memberStatusHistory = pgTable("member_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const memberNotes = pgTable("member_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  visibility: text("visibility").notNull(), // admin_only | coordinator_visible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Elections & Voting
export const elections = pgTable("elections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  position: text("position").notNull(), // "State Chairman", "Youth Leader", etc.
  stateId: varchar("state_id").references(() => states.id), // Optional - for state-level elections
  lgaId: varchar("lga_id").references(() => lgas.id), // Optional - for LGA-level elections
  wardId: varchar("ward_id").references(() => wards.id), // Optional - for ward-level elections
  status: electionStatusEnum("status").default("upcoming"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalVotes: integer("total_votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  electionId: varchar("election_id").notNull().references(() => elections.id),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  manifesto: text("manifesto").notNull(),
  experience: text("experience").notNull(),
  votes: integer("votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  electionId: varchar("election_id").notNull().references(() => elections.id),
  candidateId: varchar("candidate_id").notNull().references(() => candidates.id),
  voterId: varchar("voter_id").notNull().references(() => members.id),
  blockchainHash: text("blockchain_hash"), // For audit trail
  castedAt: timestamp("casted_at").defaultNow(),
});

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "Town Hall", "Rally", "Summit", etc.
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  coordinates: jsonb("coordinates"), // { lat: number; lng: number } for location validation
  points: integer("points").default(10), // Points awarded for attendance
  stateId: varchar("state_id").references(() => states.id),
  lgaId: varchar("lga_id").references(() => lgas.id),
  wardId: varchar("ward_id").references(() => wards.id),
  maxAttendees: integer("max_attendees"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  status: text("status").default("confirmed"), // confirmed, cancelled
  rsvpedAt: timestamp("rsvped_at").defaultNow(),
});

// Event Attendance (actual check-ins for points)
export const eventAttendance = pgTable("event_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
  coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>(),
  pointsEarned: integer("points_earned").default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
}, (table) => ({
  // Unique constraint: one check-in per member per event
  uniqueEventAttendance: unique().on(table.memberId, table.eventId),
}));

// Volunteer Marketplace (Enhanced for user-created tasks)
export const volunteerTasks = pgTable("volunteer_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  taskCategory: taskCategoryEnum("task_category").default("general"),
  taskScope: taskScopeEnum("task_scope").default("national"),
  location: text("location").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  points: integer("points").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  deadline: timestamp("deadline"),
  difficulty: taskDifficultyEnum("difficulty").notNull(),
  maxVolunteers: integer("max_volunteers"),
  currentVolunteers: integer("current_volunteers").default(0),
  creatorId: varchar("creator_id").notNull().references(() => members.id),
  stateId: varchar("state_id").references(() => states.id),
  lgaId: varchar("lga_id").references(() => lgas.id),
  wardId: varchar("ward_id").references(() => wards.id),
  isUserCreated: boolean("is_user_created").default(false),
  fundingStatus: text("funding_status").default("unfunded"),
  autoApprove: boolean("auto_approve").default(false),
  requiresProof: boolean("requires_proof").default(true),
  cooldownHours: integer("cooldown_hours").default(0),
  status: text("status").default("open"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskApplications = pgTable("task_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => volunteerTasks.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  status: text("status").default("pending"), // pending, accepted, rejected, completed
  appliedAt: timestamp("applied_at").defaultNow(),
});

// Political Literacy
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  category: text("category").notNull(),
  difficulty: quizDifficultyEnum("difficulty").notNull().default("medium"),
  explanation: text("explanation"),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull().references(() => quizzes.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  selectedAnswer: integer("selected_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsEarned: integer("points_earned").default(0),
  attemptedAt: timestamp("attempted_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
  completionTime: integer("completion_time"), // Time in seconds to complete quiz
}, (table) => ({
  // Unique constraint: one attempt per member per quiz
  uniqueQuizAttempt: unique().on(table.memberId, table.quizId),
}));

// Issue Campaigns
export const issueCampaigns = pgTable("issue_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  authorId: varchar("author_id").notNull().references(() => members.id),
  stateId: varchar("state_id").references(() => states.id),
  lgaId: varchar("lga_id").references(() => lgas.id),
  wardId: varchar("ward_id").references(() => wards.id),
  targetVotes: integer("target_votes").default(5000),
  currentVotes: integer("current_votes").default(0),
  status: campaignStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaignVotes = pgTable("campaign_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => issueCampaigns.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  votedAt: timestamp("voted_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
}, (table) => ({
  // Unique constraint: one vote per member per campaign
  uniqueCampaignVote: unique().on(table.memberId, table.campaignId),
}));

export const campaignComments = pgTable("campaign_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => issueCampaigns.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gamification
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // grassroots, voter, champion, etc.
  imageUrl: text("image_url"),
  category: badgeCategoryEnum("category").default("special"),
  criteria: jsonb("criteria").$type<{ type: string; value: number }>().notNull(),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  progress: integer("progress").default(0), // Current progress towards badge requirement
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  requirement: jsonb("requirement").$type<{ type: string; value: number }>().notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull(),
  rarity: achievementRarityEnum("rarity").default("bronze"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Point Ledger - Full transaction tracking
export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  transactionType: text("transaction_type").notNull(), // earn, spend, transfer, purchase, refund
  source: text("source").notNull(), // quiz, task, campaign, events, engagement, purchase, etc.
  amount: integer("amount").notNull(), // Positive for earning, negative for spending
  balanceAfter: integer("balance_after").notNull(), // Running balance after this transaction
  referenceId: varchar("reference_id"), // ID of related entity (quizId, taskId, etc.)
  referenceType: text("reference_type"), // quiz, task, share, referral, purchase, etc.
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  memberDateIdx: index("user_points_member_date_idx").on(table.memberId, table.createdAt),
  referenceIdx: index("user_points_reference_idx").on(table.referenceType, table.referenceId),
}));

// Referrals (Enhanced with 100 points reward)
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => members.id), // Who referred
  referredId: varchar("referred_id").notNull().references(() => members.id), // Who was referred
  referralCode: text("referral_code"), // Unique code used for referral
  pointsEarned: integer("points_earned").default(100), // Points earned by referrer (always 100)
  status: text("status").default("pending"), // pending, completed, cancelled
  completedAt: timestamp("completed_at"), // When referred member activated
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure each person can only be referred once
  uniqueReferredIdx: unique("unique_referred_idx").on(table.referredId),
}));

// Point Conversion Settings (Flutterwave)
export const pointConversionSettings = pgTable("point_conversion_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productType: text("product_type").notNull(), // "airtime" or "data"
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(), // points to 1 NGN
  minPoints: integer("min_points").default(100),
  maxPoints: integer("max_points").default(10000),
  carrierOverrides: jsonb("carrier_overrides").$type<Record<string, number>>(), // carrier-specific rates
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point Redemptions (Transaction History)
export const pointRedemptions = pgTable("point_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  phoneNumber: text("phone_number").notNull(),
  carrier: text("carrier").notNull(), // MTN, Airtel, Glo, 9Mobile
  productType: text("product_type").notNull(), // airtime or data
  nairaValue: decimal("naira_value", { precision: 10, scale: 2 }).notNull(),
  pointsDebited: integer("points_debited").notNull(),
  flutterwaveReference: text("flutterwave_reference"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Point Purchases (Paystack - Buy points with card)
export const pointPurchases = pgTable("point_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  pointsAmount: integer("points_amount").notNull(), // Points to purchase
  nairaAmount: decimal("naira_amount", { precision: 10, scale: 2 }).notNull(), // Amount paid in NGN
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 2 }).notNull(), // Rate at time of purchase
  paystackReference: text("paystack_reference").notNull().unique(),
  paystackAccessCode: text("paystack_access_code"),
  status: text("status").notNull().default("pending"), // pending, success, failed, abandoned
  paymentMethod: text("payment_method"), // card, bank_transfer, ussd
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  memberDateIdx: index("point_purchases_member_date_idx").on(table.memberId, table.createdAt),
}));

// Social Media Shares (10 points per verified share)
export const socialShares = pgTable("social_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  platform: text("platform").notNull(), // facebook, twitter, instagram, whatsapp
  contentType: text("content_type").notNull(), // news, event, campaign, election
  contentId: varchar("content_id").notNull(), // ID of shared content
  shareUrl: text("share_url"),
  shareHash: text("share_hash").notNull(), // Hash to prevent duplicates
  verified: boolean("verified").default(false),
  pointsAwarded: integer("points_awarded").default(0),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate shares
  uniqueShareIdx: unique("unique_share_idx").on(table.memberId, table.platform, table.shareHash),
  memberPlatformIdx: index("social_shares_member_platform_idx").on(table.memberId, table.platform),
}));

// Share Verifications (Proof and validation)
export const shareVerifications = pgTable("share_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: varchar("share_id").notNull().references(() => socialShares.id),
  verificationMethod: text("verification_method").notNull(), // screenshot, api, manual
  proofUrl: text("proof_url"), // Screenshot or evidence
  verifiedBy: varchar("verified_by").references(() => users.id), // Admin who verified
  status: text("status").default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// Volunteer Task Funding (Escrow for user-created tasks - SINGLE funding per task)
export const volunteerTaskFunding = pgTable("volunteer_task_funding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => volunteerTasks.id).unique(), // UNIQUE: One funding per task
  funderId: varchar("funder_id").notNull().references(() => members.id), // Task creator  
  totalPointsLocked: integer("total_points_locked").notNull(), // Total points locked in escrow
  pointsPerCompletion: integer("points_per_completion").notNull(), // Points per approved completion
  maxCompletions: integer("max_completions").default(1), // How many can complete this task
  completionsCount: integer("completions_count").default(0), // How many have completed
  pointsDistributed: integer("points_distributed").default(0), // Points already paid out
  status: text("status").default("locked"), // locked, distributing, completed, refunded
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  // Ensure one funding per task
  uniqueTaskFunding: unique("unique_task_funding").on(table.taskId),
}));

// Note: Point balances will be computed dynamically from user_points ledger
// or implemented as a materialized view with triggers in the future

// Leaderboard Snapshots (Cache for performance)
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(), // daily, weekly, monthly, all-time
  scope: text("scope").notNull(), // national, state
  scopeId: varchar("scope_id"), // state ID if scope is state
  data: jsonb("data").$type<{rank: number; memberId: string; points: number; stateName?: string}[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  periodScopeIdx: index("leaderboard_snapshots_period_scope_idx").on(table.period, table.scope, table.scopeId),
}));

// Micro Tasks
export const microTasks = pgTable("micro_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  taskCategory: taskCategoryEnum("task_category").default("general"),
  taskScope: taskScopeEnum("task_scope").default("national"),
  stateId: varchar("state_id").references(() => states.id),
  lgaId: varchar("lga_id").references(() => lgas.id),
  wardId: varchar("ward_id").references(() => wards.id),
  points: integer("points").notNull(),
  completionRequirement: text("completion_requirement").default("quiz"),
  options: jsonb("options").$type<string[]>(),
  correctAnswers: jsonb("correct_answers").$type<number[]>(),
  timeEstimate: text("time_estimate").notNull(),
  cooldownHours: integer("cooldown_hours").default(0),
  maxCompletionsTotal: integer("max_completions_total"),
  currentCompletions: integer("current_completions").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskCompletions = pgTable("task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(), // ID of either micro or volunteer task
  taskType: text("task_type").notNull(), // "micro" | "volunteer"
  memberId: varchar("member_id").notNull().references(() => members.id),
  proofUrl: text("proof_url"), // Screenshot or evidence (image URL from object storage)
  status: text("status").default("pending"), // pending, approved, rejected
  pointsEarned: integer("points_earned").default(0),
  verified: boolean("verified").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved/rejected
  approvedAt: timestamp("approved_at"), // When it was approved/rejected
  rejectionReason: text("rejection_reason"), // Why it was rejected (optional)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
}, (table) => ({
  // Unique constraint: one completion per member per task
  uniqueTaskCompletion: unique().on(table.memberId, table.taskId, table.taskType),
}));

// Election Day Monitoring
export const pollingUnits = pgTable("polling_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  unitCode: text("unit_code").notNull().unique(),
  wardId: varchar("ward_id").notNull().references(() => wards.id),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  status: pollingUnitStatusEnum("status").default("active"),
  votes: integer("votes").default(0),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const pollingAgentStatusEnum = pgEnum("polling_agent_status", [
  "assigned", "active", "checked_in", "completed", "revoked"
]);

export const pollingAgents = pgTable("polling_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  pollingUnitId: varchar("polling_unit_id").notNull().references(() => pollingUnits.id),
  electionId: varchar("election_id").references(() => generalElections.id),
  agentCode: text("agent_code").notNull().unique(),
  agentPin: text("agent_pin").notNull(),
  status: pollingAgentStatusEnum("status").default("assigned"),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  checkedInAt: timestamp("checked_in_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  uniqueAssignment: unique().on(table.memberId, table.pollingUnitId, table.electionId),
}));

// General Elections (National/State elections - separate from party primaries)
export const generalElectionPositionEnum = pgEnum("general_election_position", [
  "presidential", "governorship", "senatorial", "house_of_reps", "state_assembly"
]);
export const generalElectionStatusEnum = pgEnum("general_election_status", [
  "upcoming", "ongoing", "completed", "cancelled"
]);

export const parties = pgTable("parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  abbreviation: text("abbreviation").notNull().unique(),
  logoUrl: text("logo_url"),
  color: text("color").notNull(),
  chairman: text("chairman"),
  founded: integer("founded"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generalElections = pgTable("general_elections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  electionYear: integer("election_year").notNull(),
  electionDate: timestamp("election_date").notNull(),
  position: generalElectionPositionEnum("position").notNull(),
  stateId: varchar("state_id").references(() => states.id),
  senatorialDistrictId: varchar("senatorial_district_id").references(() => senatorialDistricts.id),
  constituency: text("constituency"),
  status: generalElectionStatusEnum("status").default("upcoming"),
  totalRegisteredVoters: integer("total_registered_voters").default(0),
  totalAccreditedVoters: integer("total_accredited_voters").default(0),
  totalVotesCast: integer("total_votes_cast").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generalElectionCandidates = pgTable("general_election_candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  electionId: varchar("election_id").notNull().references(() => generalElections.id),
  partyId: varchar("party_id").notNull().references(() => parties.id),
  name: text("name").notNull(),
  runningMate: text("running_mate"),
  imageUrl: text("image_url"),
  totalVotes: integer("total_votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pollingUnitResults = pgTable("polling_unit_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  electionId: varchar("election_id").notNull().references(() => generalElections.id),
  pollingUnitId: varchar("polling_unit_id").notNull().references(() => pollingUnits.id),
  candidateId: varchar("candidate_id").notNull().references(() => generalElectionCandidates.id),
  partyId: varchar("party_id").notNull().references(() => parties.id),
  votes: integer("votes").notNull().default(0),
  registeredVoters: integer("registered_voters").default(0),
  accreditedVoters: integer("accredited_voters").default(0),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  reportedBy: varchar("reported_by").references(() => members.id),
  reportedAt: timestamp("reported_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deviceInfo: jsonb("device_info").$type<{ userAgent?: string; ip?: string; timestamp?: string }>(),
}, (table) => ({
  uniqueResult: unique().on(table.electionId, table.pollingUnitId, table.candidateId),
}));

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollingUnitId: varchar("polling_unit_id").references(() => pollingUnits.id),
  reporterId: varchar("reporter_id").references(() => members.id),
  severity: incidentSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>(),
  status: text("status").default("reported"), // reported, investigating, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const incidentMedia = pgTable("incident_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull(), // image, video
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// App Settings (key-value store for global config)
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// News Feed
export const newsPosts = pgTable("news_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  authorId: varchar("author_id").references(() => users.id),
  stateId: varchar("state_id").references(() => states.id),
  lgaId: varchar("lga_id").references(() => lgas.id),
  wardId: varchar("ward_id").references(() => wards.id),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
});

export const postEngagement = pgTable("post_engagement", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => newsPosts.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  type: text("type").notNull(), // like, comment, share
  content: text("content"), // For comments
  createdAt: timestamp("created_at").defaultNow(),
});

// News Comments
export const newsComments = pgTable("news_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  newsPostId: varchar("news_post_id").notNull().references(() => newsPosts.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  parentId: varchar("parent_id").references((): any => newsComments.id, { onDelete: "cascade" }), // For nested replies
  createdAt: timestamp("created_at").defaultNow(),
});

export const newsCommentLikes = pgTable("news_comment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => newsComments.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // dues_reminder, event, election, badge, etc.
  read: boolean("read").default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ideas System
export const ideas = pgTable("ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // politics, infrastructure, education, health, economy, youth, security, other
  status: ideaStatusEnum("status").default("pending"),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  votesCount: integer("votes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaVotes = pgTable("idea_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  voteType: voteTypeEnum("vote_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaComments = pgTable("idea_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ideaId: varchar("idea_id").notNull().references(() => ideas.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge Base
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"), // lucide icon name
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => knowledgeCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(), // markdown content
  summary: text("summary"),
  authorId: varchar("author_id").notNull().references(() => users.id),
  published: boolean("published").default(false),
  viewsCount: integer("views_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => knowledgeCategories.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0),
  published: boolean("published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const articleFeedback = pgTable("article_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  helpful: boolean("helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Political Facts & Quotes Knowledge Base
export const politicalFacts = pgTable("political_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: integer("external_id"),
  content: text("content").notNull(),
  source: text("source").notNull(),
  year: integer("year"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const politicalQuotes = pgTable("political_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: integer("external_id"),
  content: text("content").notNull(),
  speaker: text("speaker").notNull(),
  position: text("position"),
  context: text("context"),
  year: integer("year"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chatbot
export const chatbotConversations = pgTable("chatbot_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").references(() => members.id, { onDelete: "set null" }), // nullable for anonymous
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatbotMessages = pgTable("chatbot_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatbotConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Donations System
export const donationCampaigns = pgTable("donation_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: donationCategoryEnum("category").notNull(),
  goalAmount: integer("goal_amount"), // in kobo/cents
  currentAmount: integer("current_amount").default(0),
  image: text("image"),
  status: donationCampaignStatusEnum("status").default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").references(() => members.id, { onDelete: "set null" }), // nullable for anonymous
  donorName: text("donor_name"),
  donorEmail: text("donor_email"),
  campaignId: varchar("campaign_id").references(() => donationCampaigns.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(), // in kobo/cents
  currency: text("currency").default("NGN"),
  paymentMethod: text("payment_method").notNull(), // paystack, bank_transfer
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  paystackReference: text("paystack_reference"),
  isAnonymous: boolean("is_anonymous").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: recurringFrequencyEnum("recurring_frequency"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recurringDonations = pgTable("recurring_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  donationId: varchar("donation_id").notNull().references(() => donations.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => donationCampaigns.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  frequency: recurringFrequencyEnum("frequency").notNull(),
  status: recurringStatusEnum("status").default("active"),
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push Notifications System
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(), // Public key for encryption
  auth: text("auth").notNull(), // Auth secret for encryption
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }).unique(),
  eventReminders: boolean("event_reminders").default(true),
  electionAnnouncements: boolean("election_announcements").default(true),
  newsAlerts: boolean("news_alerts").default(true),
  duesReminders: boolean("dues_reminders").default(true),
  taskAssignments: boolean("task_assignments").default(true),
  campaignUpdates: boolean("campaign_updates").default(true),
  achievementNotifications: boolean("achievement_notifications").default(true),
  referralRewards: boolean("referral_rewards").default(true),
  systemAnnouncements: boolean("system_announcements").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mobilePushTokens = pgTable("mobile_push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(),
  deviceName: text("device_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logging System
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  memberId: varchar("member_id").references(() => members.id, { onDelete: "set null" }),
  action: text("action").notNull(), // login, vote, payment, admin_action, etc.
  resourceType: text("resource_type"), // election, member, payment, etc.
  resourceId: varchar("resource_id"),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
  status: text("status").notNull(), // success, failure
  suspiciousActivity: boolean("suspicious_activity").default(false),
  fraudScore: integer("fraud_score").default(0),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fraud Detection & Rate Limiting
export const fraudDetectionLogs = pgTable("fraud_detection_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  actionType: text("action_type").notNull(), // quiz, task, vote, event
  detectionReason: text("detection_reason").notNull(), // duplicate_action, rate_limit_exceeded, suspicious_timing, etc.
  severity: text("severity").notNull(), // low, medium, high, critical
  blocked: boolean("blocked").default(true),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Account suspension tracking
export const accountSuspensions = pgTable("account_suspensions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  reason: text("reason").notNull(),
  suspendedBy: varchar("suspended_by").references(() => users.id),
  suspendedAt: timestamp("suspended_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
});

// Relations
export const statesRelations = relations(states, ({ many }) => ({
  lgas: many(lgas),
  events: many(events),
  newsPosts: many(newsPosts),
  volunteerTasks: many(volunteerTasks),
  issueCampaigns: many(issueCampaigns),
}));

export const lgasRelations = relations(lgas, ({ one, many }) => ({
  state: one(states, {
    fields: [lgas.stateId],
    references: [states.id],
  }),
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ one, many }) => ({
  lga: one(lgas, {
    fields: [wards.lgaId],
    references: [lgas.id],
  }),
  members: many(members),
  pollingUnits: many(pollingUnits),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
  newsPosts: many(newsPosts),
  knowledgeArticles: many(knowledgeArticles),
  donationCampaigns: many(donationCampaigns),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  ward: one(wards, {
    fields: [members.wardId],
    references: [wards.id],
  }),
  eventRsvps: many(eventRsvps),
  taskApplications: many(taskApplications),
  quizAttempts: many(quizAttempts),
  campaignVotes: many(campaignVotes),
  campaignComments: many(campaignComments),
  issueCampaigns: many(issueCampaigns),
  userBadges: many(userBadges),
  userPoints: many(userPoints),
  taskCompletions: many(taskCompletions),
  incidents: many(incidents),
  postEngagement: many(postEngagement),
  notifications: many(notifications),
  statusHistory: many(memberStatusHistory),
  notes: many(memberNotes),
  ideas: many(ideas),
  ideaVotes: many(ideaVotes),
  ideaComments: many(ideaComments),
  articleFeedback: many(articleFeedback),
  chatbotConversations: many(chatbotConversations),
  donations: many(donations),
  recurringDonations: many(recurringDonations),
  membershipDues: many(membershipDues),
  recurringMembershipDues: many(recurringMembershipDues),
  newsComments: many(newsComments),
  newsCommentLikes: many(newsCommentLikes),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  idCards: many(memberIdCards),
  pointRedemptions: many(pointRedemptions),
  eventAttendance: many(eventAttendance),
  fraudDetectionLogs: many(fraudDetectionLogs),
  accountSuspensions: many(accountSuspensions),
}));

export const memberIdCardsRelations = relations(memberIdCards, ({ one }) => ({
  member: one(members, {
    fields: [memberIdCards.memberId],
    references: [members.id],
  }),
  generatedBy: one(users, {
    fields: [memberIdCards.generatedByUserId],
    references: [users.id],
  }),
}));

export const newsPostsRelations = relations(newsPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [newsPosts.authorId],
    references: [users.id],
  }),
  state: one(states, {
    fields: [newsPosts.stateId],
    references: [states.id],
  }),
  lga: one(lgas, {
    fields: [newsPosts.lgaId],
    references: [lgas.id],
  }),
  ward: one(wards, {
    fields: [newsPosts.wardId],
    references: [wards.id],
  }),
  engagement: many(postEngagement),
  comments: many(newsComments),
}));

export const electionsRelations = relations(elections, ({ many }) => ({
  candidates: many(candidates),
  votes: many(votes),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  election: one(elections, {
    fields: [candidates.electionId],
    references: [elections.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  election: one(elections, {
    fields: [votes.electionId],
    references: [elections.id],
  }),
  candidate: one(candidates, {
    fields: [votes.candidateId],
    references: [candidates.id],
  }),
  voter: one(members, {
    fields: [votes.voterId],
    references: [members.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  state: one(states, {
    fields: [events.stateId],
    references: [states.id],
  }),
  lga: one(lgas, {
    fields: [events.lgaId],
    references: [lgas.id],
  }),
  ward: one(wards, {
    fields: [events.wardId],
    references: [wards.id],
  }),
  rsvps: many(eventRsvps),
  attendance: many(eventAttendance),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  member: one(members, {
    fields: [eventRsvps.memberId],
    references: [members.id],
  }),
}));

export const eventAttendanceRelations = relations(eventAttendance, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendance.eventId],
    references: [events.id],
  }),
  member: one(members, {
    fields: [eventAttendance.memberId],
    references: [members.id],
  }),
}));

export const volunteerTasksRelations = relations(volunteerTasks, ({ one, many }) => ({
  applications: many(taskApplications),
  creator: one(members, {
    fields: [volunteerTasks.creatorId],
    references: [members.id],
  }),
  state: one(states, {
    fields: [volunteerTasks.stateId],
    references: [states.id],
  }),
  lga: one(lgas, {
    fields: [volunteerTasks.lgaId],
    references: [lgas.id],
  }),
  ward: one(wards, {
    fields: [volunteerTasks.wardId],
    references: [wards.id],
  }),
}));

export const taskApplicationsRelations = relations(taskApplications, ({ one }) => ({
  task: one(volunteerTasks, {
    fields: [taskApplications.taskId],
    references: [volunteerTasks.id],
  }),
  member: one(members, {
    fields: [taskApplications.memberId],
    references: [members.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  attempts: many(quizAttempts),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  member: one(members, {
    fields: [quizAttempts.memberId],
    references: [members.id],
  }),
}));

export const issueCampaignsRelations = relations(issueCampaigns, ({ one, many }) => ({
  author: one(members, {
    fields: [issueCampaigns.authorId],
    references: [members.id],
  }),
  state: one(states, {
    fields: [issueCampaigns.stateId],
    references: [states.id],
  }),
  lga: one(lgas, {
    fields: [issueCampaigns.lgaId],
    references: [lgas.id],
  }),
  ward: one(wards, {
    fields: [issueCampaigns.wardId],
    references: [wards.id],
  }),
  votes: many(campaignVotes),
  comments: many(campaignComments),
}));

export const campaignVotesRelations = relations(campaignVotes, ({ one }) => ({
  campaign: one(issueCampaigns, {
    fields: [campaignVotes.campaignId],
    references: [issueCampaigns.id],
  }),
  member: one(members, {
    fields: [campaignVotes.memberId],
    references: [members.id],
  }),
}));

export const campaignCommentsRelations = relations(campaignComments, ({ one }) => ({
  campaign: one(issueCampaigns, {
    fields: [campaignComments.campaignId],
    references: [issueCampaigns.id],
  }),
  member: one(members, {
    fields: [campaignComments.memberId],
    references: [members.id],
  }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  member: one(members, {
    fields: [userBadges.memberId],
    references: [members.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const userPointsRelations = relations(userPoints, ({ one }) => ({
  member: one(members, {
    fields: [userPoints.memberId],
    references: [members.id],
  }),
}));

export const microTasksRelations = relations(microTasks, ({ one, many }) => ({
  completions: many(taskCompletions),
  state: one(states, {
    fields: [microTasks.stateId],
    references: [states.id],
  }),
  lga: one(lgas, {
    fields: [microTasks.lgaId],
    references: [lgas.id],
  }),
  ward: one(wards, {
    fields: [microTasks.wardId],
    references: [wards.id],
  }),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(microTasks, {
    fields: [taskCompletions.taskId],
    references: [microTasks.id],
  }),
  member: one(members, {
    fields: [taskCompletions.memberId],
    references: [members.id],
  }),
  approver: one(users, {
    fields: [taskCompletions.approvedBy],
    references: [users.id],
  }),
}));

export const pollingUnitsRelations = relations(pollingUnits, ({ one, many }) => ({
  ward: one(wards, {
    fields: [pollingUnits.wardId],
    references: [wards.id],
  }),
  incidents: many(incidents),
  results: many(pollingUnitResults),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  candidates: many(generalElectionCandidates),
  results: many(pollingUnitResults),
}));

export const generalElectionsRelations = relations(generalElections, ({ one, many }) => ({
  state: one(states, {
    fields: [generalElections.stateId],
    references: [states.id],
  }),
  candidates: many(generalElectionCandidates),
  results: many(pollingUnitResults),
}));

export const generalElectionCandidatesRelations = relations(generalElectionCandidates, ({ one, many }) => ({
  election: one(generalElections, {
    fields: [generalElectionCandidates.electionId],
    references: [generalElections.id],
  }),
  party: one(parties, {
    fields: [generalElectionCandidates.partyId],
    references: [parties.id],
  }),
  results: many(pollingUnitResults),
}));

export const pollingAgentsRelations = relations(pollingAgents, ({ one }) => ({
  member: one(members, {
    fields: [pollingAgents.memberId],
    references: [members.id],
  }),
  pollingUnit: one(pollingUnits, {
    fields: [pollingAgents.pollingUnitId],
    references: [pollingUnits.id],
  }),
  election: one(generalElections, {
    fields: [pollingAgents.electionId],
    references: [generalElections.id],
  }),
  assignedByUser: one(users, {
    fields: [pollingAgents.assignedBy],
    references: [users.id],
  }),
}));

export const pollingUnitResultsRelations = relations(pollingUnitResults, ({ one }) => ({
  election: one(generalElections, {
    fields: [pollingUnitResults.electionId],
    references: [generalElections.id],
  }),
  pollingUnit: one(pollingUnits, {
    fields: [pollingUnitResults.pollingUnitId],
    references: [pollingUnits.id],
  }),
  candidate: one(generalElectionCandidates, {
    fields: [pollingUnitResults.candidateId],
    references: [generalElectionCandidates.id],
  }),
  party: one(parties, {
    fields: [pollingUnitResults.partyId],
    references: [parties.id],
  }),
  reporter: one(members, {
    fields: [pollingUnitResults.reportedBy],
    references: [members.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  pollingUnit: one(pollingUnits, {
    fields: [incidents.pollingUnitId],
    references: [pollingUnits.id],
  }),
  reporter: one(members, {
    fields: [incidents.reporterId],
    references: [members.id],
  }),
  media: many(incidentMedia),
}));

export const incidentMediaRelations = relations(incidentMedia, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentMedia.incidentId],
    references: [incidents.id],
  }),
}));

export const postEngagementRelations = relations(postEngagement, ({ one }) => ({
  post: one(newsPosts, {
    fields: [postEngagement.postId],
    references: [newsPosts.id],
  }),
  member: one(members, {
    fields: [postEngagement.memberId],
    references: [members.id],
  }),
}));

export const newsCommentsRelations = relations(newsComments, ({ one, many }) => ({
  newsPost: one(newsPosts, {
    fields: [newsComments.newsPostId],
    references: [newsPosts.id],
  }),
  member: one(members, {
    fields: [newsComments.memberId],
    references: [members.id],
  }),
  parent: one(newsComments, {
    fields: [newsComments.parentId],
    references: [newsComments.id],
  }),
  replies: many(newsComments),
  likes: many(newsCommentLikes),
}));

export const newsCommentLikesRelations = relations(newsCommentLikes, ({ one }) => ({
  comment: one(newsComments, {
    fields: [newsCommentLikes.commentId],
    references: [newsComments.id],
  }),
  member: one(members, {
    fields: [newsCommentLikes.memberId],
    references: [members.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  member: one(members, {
    fields: [notifications.memberId],
    references: [members.id],
  }),
}));

export const membershipDuesRelations = relations(membershipDues, ({ one }) => ({
  member: one(members, {
    fields: [membershipDues.memberId],
    references: [members.id],
  }),
}));

export const recurringMembershipDuesRelations = relations(recurringMembershipDues, ({ one }) => ({
  member: one(members, {
    fields: [recurringMembershipDues.memberId],
    references: [members.id],
  }),
}));

export const memberStatusHistoryRelations = relations(memberStatusHistory, ({ one }) => ({
  member: one(members, {
    fields: [memberStatusHistory.memberId],
    references: [members.id],
  }),
  actor: one(users, {
    fields: [memberStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const memberNotesRelations = relations(memberNotes, ({ one }) => ({
  member: one(members, {
    fields: [memberNotes.memberId],
    references: [members.id],
  }),
  author: one(users, {
    fields: [memberNotes.authorId],
    references: [users.id],
  }),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  member: one(members, {
    fields: [ideas.memberId],
    references: [members.id],
  }),
  votes: many(ideaVotes),
  comments: many(ideaComments),
}));

export const ideaVotesRelations = relations(ideaVotes, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaVotes.ideaId],
    references: [ideas.id],
  }),
  member: one(members, {
    fields: [ideaVotes.memberId],
    references: [members.id],
  }),
}));

export const ideaCommentsRelations = relations(ideaComments, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaComments.ideaId],
    references: [ideas.id],
  }),
  member: one(members, {
    fields: [ideaComments.memberId],
    references: [members.id],
  }),
}));

export const knowledgeCategoriesRelations = relations(knowledgeCategories, ({ many }) => ({
  articles: many(knowledgeArticles),
  faqs: many(faqs),
}));

export const knowledgeArticlesRelations = relations(knowledgeArticles, ({ one, many }) => ({
  category: one(knowledgeCategories, {
    fields: [knowledgeArticles.categoryId],
    references: [knowledgeCategories.id],
  }),
  author: one(users, {
    fields: [knowledgeArticles.authorId],
    references: [users.id],
  }),
  feedback: many(articleFeedback),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  category: one(knowledgeCategories, {
    fields: [faqs.categoryId],
    references: [knowledgeCategories.id],
  }),
}));

export const articleFeedbackRelations = relations(articleFeedback, ({ one }) => ({
  article: one(knowledgeArticles, {
    fields: [articleFeedback.articleId],
    references: [knowledgeArticles.id],
  }),
  member: one(members, {
    fields: [articleFeedback.memberId],
    references: [members.id],
  }),
}));

export const chatbotConversationsRelations = relations(chatbotConversations, ({ one, many }) => ({
  member: one(members, {
    fields: [chatbotConversations.memberId],
    references: [members.id],
  }),
  messages: many(chatbotMessages),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  conversation: one(chatbotConversations, {
    fields: [chatbotMessages.conversationId],
    references: [chatbotConversations.id],
  }),
}));

export const donationCampaignsRelations = relations(donationCampaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [donationCampaigns.createdBy],
    references: [users.id],
  }),
  donations: many(donations),
  recurringDonations: many(recurringDonations),
}));

export const donationsRelations = relations(donations, ({ one, many }) => ({
  member: one(members, {
    fields: [donations.memberId],
    references: [members.id],
  }),
  campaign: one(donationCampaigns, {
    fields: [donations.campaignId],
    references: [donationCampaigns.id],
  }),
  recurringDonation: many(recurringDonations),
}));

export const recurringDonationsRelations = relations(recurringDonations, ({ one }) => ({
  donation: one(donations, {
    fields: [recurringDonations.donationId],
    references: [donations.id],
  }),
  member: one(members, {
    fields: [recurringDonations.memberId],
    references: [members.id],
  }),
  campaign: one(donationCampaigns, {
    fields: [recurringDonations.campaignId],
    references: [donationCampaigns.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(members, {
    fields: [referrals.referrerId],
    references: [members.id],
    relationName: "referrer"
  }),
  referred: one(members, {
    fields: [referrals.referredId],
    references: [members.id],
    relationName: "referred"
  }),
}));

export const pointRedemptionsRelations = relations(pointRedemptions, ({ one }) => ({
  member: one(members, {
    fields: [pointRedemptions.memberId],
    references: [members.id],
  }),
}));

// Insert & Select Schemas
export const insertStateSchema = createInsertSchema(states).omit({ id: true, createdAt: true });
export const insertLgaSchema = createInsertSchema(lgas).omit({ id: true, createdAt: true });
export const insertWardSchema = createInsertSchema(wards).omit({ id: true, createdAt: true });
export const insertSenatorialDistrictSchema = createInsertSchema(senatorialDistricts).omit({ id: true, createdAt: true });
export const insertElectoralStatsSchema = createInsertSchema(electoralStats).omit({ id: true, createdAt: true });
export const insertRegionalElectoralStatsSchema = createInsertSchema(regionalElectoralStats).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ id: true, createdAt: true });
export const insertMemberSchema = createInsertSchema(members).omit({ id: true, joinDate: true });
export const insertDuesSchema = createInsertSchema(membershipDues).omit({ id: true, createdAt: true, paidAt: true });
export const insertRecurringDuesSchema = createInsertSchema(recurringMembershipDues).omit({ id: true, createdAt: true, updatedAt: true, lastPaymentDate: true });
export const insertMemberIdCardSchema = createInsertSchema(memberIdCards).omit({ id: true, createdAt: true, lastGeneratedAt: true });
export const insertMemberStatusHistorySchema = createInsertSchema(memberStatusHistory).omit({ id: true, createdAt: true });
export const insertMemberNoteSchema = createInsertSchema(memberNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertElectionSchema = createInsertSchema(elections).omit({ id: true, createdAt: true, totalVotes: true });
export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true, createdAt: true, votes: true });
export const insertVoteSchema = createInsertSchema(votes).omit({ id: true, castedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({ id: true, rsvpedAt: true });
export const insertEventAttendanceSchema = createInsertSchema(eventAttendance).omit({ id: true, checkedInAt: true });
export const insertVolunteerTaskSchema = createInsertSchema(volunteerTasks).omit({ id: true, createdAt: true });
export const insertTaskApplicationSchema = createInsertSchema(taskApplications).omit({ id: true, appliedAt: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, attemptedAt: true });
export const insertCampaignSchema = createInsertSchema(issueCampaigns).omit({ id: true, createdAt: true, currentVotes: true });
export const insertMicroTaskSchema = createInsertSchema(microTasks).omit({ id: true, createdAt: true });
export const insertTaskCompletionSchema = createInsertSchema(taskCompletions).omit({ id: true, completedAt: true });
export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export const insertNewsPostSchema = createInsertSchema(newsPosts).omit({ id: true, publishedAt: true, likes: true, comments: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertIdeaSchema = createInsertSchema(ideas).omit({ id: true, createdAt: true, votesCount: true, commentsCount: true });
export const insertIdeaVoteSchema = createInsertSchema(ideaVotes).omit({ id: true, createdAt: true });
export const insertIdeaCommentSchema = createInsertSchema(ideaComments).omit({ id: true, createdAt: true });
export const insertKnowledgeCategorySchema = createInsertSchema(knowledgeCategories).omit({ id: true, createdAt: true });
export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({ id: true, createdAt: true, updatedAt: true, viewsCount: true, helpfulCount: true });
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true });
export const insertArticleFeedbackSchema = createInsertSchema(articleFeedback).omit({ id: true, createdAt: true });
export const insertPoliticalFactSchema = createInsertSchema(politicalFacts).omit({ id: true, createdAt: true });
export const insertPoliticalQuoteSchema = createInsertSchema(politicalQuotes).omit({ id: true, createdAt: true });
export const insertChatbotConversationSchema = createInsertSchema(chatbotConversations).omit({ id: true, createdAt: true });
export const insertChatbotMessageSchema = createInsertSchema(chatbotMessages).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export const insertUserPointsSchema = createInsertSchema(userPoints).omit({ id: true, createdAt: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, createdAt: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, createdAt: true, completedAt: true });
export const insertDonationCampaignSchema = createInsertSchema(donationCampaigns).omit({ id: true, createdAt: true, updatedAt: true, currentAmount: true });
export const insertDonationSchema = createInsertSchema(donations).omit({ id: true, createdAt: true });
export const insertRecurringDonationSchema = createInsertSchema(recurringDonations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNewsCommentSchema = createInsertSchema(newsComments).omit({ id: true, createdAt: true, likes: true });
export const insertNewsCommentLikeSchema = createInsertSchema(newsCommentLikes).omit({ id: true, createdAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPointConversionSettingSchema = createInsertSchema(pointConversionSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPointRedemptionSchema = createInsertSchema(pointRedemptions).omit({ id: true, createdAt: true, completedAt: true });
export const insertFraudDetectionLogSchema = createInsertSchema(fraudDetectionLogs).omit({ id: true, createdAt: true });
export const insertAccountSuspensionSchema = createInsertSchema(accountSuspensions).omit({ id: true, suspendedAt: true });
export const insertPartySchema = createInsertSchema(parties).omit({ id: true, createdAt: true });
export const insertGeneralElectionSchema = createInsertSchema(generalElections).omit({ id: true, createdAt: true, updatedAt: true, totalVotesCast: true, totalRegisteredVoters: true, totalAccreditedVoters: true });
export const insertGeneralElectionCandidateSchema = createInsertSchema(generalElectionCandidates).omit({ id: true, createdAt: true, totalVotes: true });
export const insertPollingUnitResultSchema = createInsertSchema(pollingUnitResults).omit({ id: true, reportedAt: true, updatedAt: true });
export const insertPollingAgentSchema = createInsertSchema(pollingAgents).omit({ id: true, assignedAt: true });

// Types
export type InsertState = z.infer<typeof insertStateSchema>;
export type State = typeof states.$inferSelect;
export type InsertLga = z.infer<typeof insertLgaSchema>;
export type Lga = typeof lgas.$inferSelect;
export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;
export type InsertSenatorialDistrict = z.infer<typeof insertSenatorialDistrictSchema>;
export type SenatorialDistrict = typeof senatorialDistricts.$inferSelect;
export type InsertElectoralStats = z.infer<typeof insertElectoralStatsSchema>;
export type ElectoralStats = typeof electoralStats.$inferSelect;
export type InsertRegionalElectoralStats = z.infer<typeof insertRegionalElectoralStatsSchema>;
export type RegionalElectoralStats = typeof regionalElectoralStats.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertDues = z.infer<typeof insertDuesSchema>;
export type MembershipDues = typeof membershipDues.$inferSelect;
export type InsertRecurringDues = z.infer<typeof insertRecurringDuesSchema>;
export type RecurringMembershipDues = typeof recurringMembershipDues.$inferSelect;
export type InsertMemberIdCard = z.infer<typeof insertMemberIdCardSchema>;
export type MemberIdCard = typeof memberIdCards.$inferSelect;
export type InsertMemberStatusHistory = z.infer<typeof insertMemberStatusHistorySchema>;
export type MemberStatusHistory = typeof memberStatusHistory.$inferSelect;
export type InsertMemberNote = z.infer<typeof insertMemberNoteSchema>;
export type MemberNote = typeof memberNotes.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Election = typeof elections.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertVolunteerTask = z.infer<typeof insertVolunteerTaskSchema>;
export type VolunteerTask = typeof volunteerTasks.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type IssueCampaign = typeof issueCampaigns.$inferSelect;
export type InsertMicroTask = z.infer<typeof insertMicroTaskSchema>;
export type MicroTask = typeof microTasks.$inferSelect;
export type InsertTaskCompletion = z.infer<typeof insertTaskCompletionSchema>;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertNewsPost = z.infer<typeof insertNewsPostSchema>;
export type NewsPost = typeof newsPosts.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;
export type InsertIdeaVote = z.infer<typeof insertIdeaVoteSchema>;
export type IdeaVote = typeof ideaVotes.$inferSelect;
export type InsertIdeaComment = z.infer<typeof insertIdeaCommentSchema>;
export type IdeaComment = typeof ideaComments.$inferSelect;
export type InsertKnowledgeCategory = z.infer<typeof insertKnowledgeCategorySchema>;
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqs.$inferSelect;
export type InsertArticleFeedback = z.infer<typeof insertArticleFeedbackSchema>;
export type ArticleFeedback = typeof articleFeedback.$inferSelect;
export type InsertPoliticalFact = z.infer<typeof insertPoliticalFactSchema>;
export type PoliticalFact = typeof politicalFacts.$inferSelect;
export type InsertPoliticalQuote = z.infer<typeof insertPoliticalQuoteSchema>;
export type PoliticalQuote = typeof politicalQuotes.$inferSelect;
export type InsertChatbotConversation = z.infer<typeof insertChatbotConversationSchema>;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type InsertChatbotMessage = z.infer<typeof insertChatbotMessageSchema>;
export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type InsertDonationCampaign = z.infer<typeof insertDonationCampaignSchema>;
export type DonationCampaign = typeof donationCampaigns.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertRecurringDonation = z.infer<typeof insertRecurringDonationSchema>;
export type RecurringDonation = typeof recurringDonations.$inferSelect;
export type InsertNewsComment = z.infer<typeof insertNewsCommentSchema>;
export type NewsComment = typeof newsComments.$inferSelect;
export type InsertNewsCommentLike = z.infer<typeof insertNewsCommentLikeSchema>;
export type NewsCommentLike = typeof newsCommentLikes.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertPointConversionSetting = z.infer<typeof insertPointConversionSettingSchema>;
export type PointConversionSetting = typeof pointConversionSettings.$inferSelect;
export type InsertPointRedemption = z.infer<typeof insertPointRedemptionSchema>;
export type PointRedemption = typeof pointRedemptions.$inferSelect;
export type InsertEventAttendance = z.infer<typeof insertEventAttendanceSchema>;
export type EventAttendance = typeof eventAttendance.$inferSelect;
export type InsertFraudDetectionLog = z.infer<typeof insertFraudDetectionLogSchema>;
export type FraudDetectionLog = typeof fraudDetectionLogs.$inferSelect;
export type InsertAccountSuspension = z.infer<typeof insertAccountSuspensionSchema>;
export type AccountSuspension = typeof accountSuspensions.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof parties.$inferSelect;
export type InsertGeneralElection = z.infer<typeof insertGeneralElectionSchema>;
export type GeneralElection = typeof generalElections.$inferSelect;
export type InsertGeneralElectionCandidate = z.infer<typeof insertGeneralElectionCandidateSchema>;
export type GeneralElectionCandidate = typeof generalElectionCandidates.$inferSelect;
export type InsertPollingUnitResult = z.infer<typeof insertPollingUnitResultSchema>;
export type PollingUnitResult = typeof pollingUnitResults.$inferSelect;
export type InsertPollingAgent = z.infer<typeof insertPollingAgentSchema>;
export type PollingAgent = typeof pollingAgents.$inferSelect;
