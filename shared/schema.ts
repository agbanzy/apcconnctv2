import { sql } from "drizzle-orm";
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
});

export const membershipDues = pgTable("membership_dues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // "stripe", "offline"
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").default("pending"), // pending, paid, failed
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
  location: text("location").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  points: integer("points").notNull(),
  deadline: timestamp("deadline"),
  difficulty: taskDifficultyEnum("difficulty").notNull(),
  maxVolunteers: integer("max_volunteers"),
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
  criteria: jsonb("criteria").$type<{ type: string; value: number }>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  points: integer("points").default(0),
  source: text("source").notNull(), // quiz, task, campaign, etc.
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Micro Tasks
export const microTasks = pgTable("micro_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull(),
  timeEstimate: text("time_estimate").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskCompletions = pgTable("task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => microTasks.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  proofUrl: text("proof_url"), // Screenshot or evidence
  status: text("status").default("pending"), // pending, approved, rejected
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
export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export const insertNewsPostSchema = createInsertSchema(newsPosts).omit({ id: true, publishedAt: true, likes: true, comments: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });

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
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertNewsPost = z.infer<typeof insertNewsPostSchema>;
export type NewsPost = typeof newsPosts.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
