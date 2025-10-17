import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const membershipStatusEnum = pgEnum("membership_status", ["active", "pending", "expired"]);
export const electionStatusEnum = pgEnum("election_status", ["upcoming", "ongoing", "completed"]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["low", "medium", "high"]);
export const pollingUnitStatusEnum = pgEnum("polling_unit_status", ["active", "delayed", "completed", "incident"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "approved", "completed", "rejected"]);
export const taskDifficultyEnum = pgEnum("task_difficulty", ["Easy", "Medium", "Hard"]);
export const ideaStatusEnum = pgEnum("idea_status", ["pending", "under_review", "approved", "rejected", "implemented"]);
export const voteTypeEnum = pgEnum("vote_type", ["upvote", "downvote"]);
export const donationCategoryEnum = pgEnum("donation_category", ["general", "campaign", "infrastructure", "youth_programs", "community_development", "emergency_relief"]);
export const donationCampaignStatusEnum = pgEnum("donation_campaign_status", ["active", "paused", "completed", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);
export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["monthly", "quarterly", "yearly"]);
export const recurringStatusEnum = pgEnum("recurring_status", ["active", "paused", "cancelled"]);
export const achievementRarityEnum = pgEnum("achievement_rarity", ["bronze", "silver", "gold", "platinum"]);
export const badgeCategoryEnum = pgEnum("badge_category", ["tasks", "events", "quizzes", "campaigns", "ideas", "engagement", "points", "special"]);

// Nigerian Administrative Structure
export const states = pgTable("states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // e.g., "LAG" for Lagos
  createdAt: timestamp("created_at").defaultNow(),
});

export const lgas = pgTable("lgas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateId: varchar("state_id").notNull().references(() => states.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wards = pgTable("wards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgaId: varchar("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  wardNumber: integer("ward_number"),
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

// Members & Membership
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  memberId: text("member_id").notNull().unique(), // e.g., APC-2024-NG-12345
  nin: text("nin"), // National Identification Number
  wardId: varchar("ward_id").notNull().references(() => wards.id),
  status: membershipStatusEnum("status").default("pending"),
  joinDate: timestamp("join_date").defaultNow(),
  interests: jsonb("interests").$type<string[]>(), // ["education", "jobs", "security"]
  referralCode: text("referral_code").unique(), // Unique code for this member to share
  referredBy: varchar("referred_by").references(() => members.id), // Who referred this member
});

export const membershipDues = pgTable("membership_dues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // "paystack", "stripe", "offline"
  stripePaymentId: text("stripe_payment_id"),
  paystackReference: text("paystack_reference"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  stateId: varchar("state_id").references(() => states.id), // Optional - for state-level events
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

// Volunteer Marketplace
export const volunteerTasks = pgTable("volunteer_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // campaign, event, outreach, etc.
  location: text("location").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  points: integer("points").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  deadline: timestamp("deadline"),
  difficulty: taskDifficultyEnum("difficulty").notNull(),
  maxVolunteers: integer("max_volunteers"),
  currentVolunteers: integer("current_volunteers").default(0),
  creatorId: varchar("creator_id").references(() => users.id),
  status: text("status").default("open"), // open, in-progress, completed
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
});

// Issue Campaigns
export const issueCampaigns = pgTable("issue_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  authorId: varchar("author_id").notNull().references(() => members.id),
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
});

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

export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  points: integer("points").default(0),
  source: text("source").notNull(), // quiz, task, campaign, events, engagement, etc.
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => members.id), // Who referred
  referredId: varchar("referred_id").notNull().references(() => members.id), // Who was referred
  pointsEarned: integer("points_earned").default(0), // Points earned by referrer
  status: text("status").default("pending"), // pending, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Micro Tasks
export const microTasks = pgTable("micro_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull(),
  options: jsonb("options").$type<string[]>(), // Multiple choice options
  correctAnswers: jsonb("correct_answers").$type<number[]>(), // Indices of correct answers
  timeEstimate: text("time_estimate").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskCompletions = pgTable("task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(), // ID of either micro or volunteer task
  taskType: text("task_type").notNull(), // "micro" | "volunteer"
  memberId: varchar("member_id").notNull().references(() => members.id),
  proofUrl: text("proof_url"), // Screenshot or evidence
  status: text("status").default("pending"), // pending, approved, rejected
  pointsEarned: integer("points_earned").default(0),
  verified: boolean("verified").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Election Day Monitoring
export const pollingUnits = pgTable("polling_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  unitCode: text("unit_code").notNull().unique(),
  wardId: varchar("ward_id").notNull().references(() => wards.id),
  status: pollingUnitStatusEnum("status").default("active"),
  votes: integer("votes").default(0),
  lastUpdate: timestamp("last_update").defaultNow(),
});

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

// News Feed
export const newsPosts = pgTable("news_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  authorId: varchar("author_id").references(() => users.id),
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
  parentId: varchar("parent_id").references(() => newsComments.id, { onDelete: "cascade" }), // For nested replies
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
  paymentMethod: text("payment_method").notNull(), // paystack, stripe, flutterwave, bank_transfer
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
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
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const statesRelations = relations(states, ({ many }) => ({
  lgas: many(lgas),
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
  ideas: many(ideas),
  ideaVotes: many(ideaVotes),
  ideaComments: many(ideaComments),
  articleFeedback: many(articleFeedback),
  chatbotConversations: many(chatbotConversations),
  donations: many(donations),
  recurringDonations: many(recurringDonations),
  newsComments: many(newsComments),
  newsCommentLikes: many(newsCommentLikes),
}));

export const newsPostsRelations = relations(newsPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [newsPosts.authorId],
    references: [users.id],
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

export const eventsRelations = relations(events, ({ many }) => ({
  rsvps: many(eventRsvps),
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

export const volunteerTasksRelations = relations(volunteerTasks, ({ many }) => ({
  applications: many(taskApplications),
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

export const microTasksRelations = relations(microTasks, ({ many }) => ({
  completions: many(taskCompletions),
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
}));

export const pollingUnitsRelations = relations(pollingUnits, ({ one, many }) => ({
  ward: one(wards, {
    fields: [pollingUnits.wardId],
    references: [wards.id],
  }),
  incidents: many(incidents),
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

// Insert & Select Schemas
export const insertStateSchema = createInsertSchema(states).omit({ id: true, createdAt: true });
export const insertLgaSchema = createInsertSchema(lgas).omit({ id: true, createdAt: true });
export const insertWardSchema = createInsertSchema(wards).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMemberSchema = createInsertSchema(members).omit({ id: true, joinDate: true });
export const insertDuesSchema = createInsertSchema(membershipDues).omit({ id: true, createdAt: true, paidAt: true });
export const insertElectionSchema = createInsertSchema(elections).omit({ id: true, createdAt: true, totalVotes: true });
export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true, createdAt: true, votes: true });
export const insertVoteSchema = createInsertSchema(votes).omit({ id: true, castedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({ id: true, rsvpedAt: true });
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

// Types
export type InsertState = z.infer<typeof insertStateSchema>;
export type State = typeof states.$inferSelect;
export type InsertLga = z.infer<typeof insertLgaSchema>;
export type Lga = typeof lgas.$inferSelect;
export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertDues = z.infer<typeof insertDuesSchema>;
export type MembershipDues = typeof membershipDues.$inferSelect;
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
