import { seedQuiz } from "./seed-quiz";
import { seedUsers } from "./seed-users";
import { seedCampaigns } from "./seed-campaigns";
import { seedEvents } from "./seed-events";
import { seedKnowledge } from "./seed-knowledge";
import { seedElectoral } from "./seed-electoral";
import { seedAdminComplete } from "./seed-admin-complete";
import { seedDonations } from "./seed-donations";
import { seedTasksDemo } from "./seed-tasks-demo";
import { seedCampaignVotes } from "./seed-campaigns-votes";
import { seedEventsAttendance } from "./seed-events-attendance";
import { seedPointsActivity } from "./seed-points-activity";

interface SeedOptions {
  adminComplete?: boolean;
  electoral?: boolean;
  quiz?: boolean;
  users?: boolean;
  campaigns?: boolean;
  events?: boolean;
  knowledge?: boolean;
  all?: boolean;
  demo?: boolean;
}

async function runAllSeeds() {
  console.log("🌱 Starting APC Connect Database Seeding...\n");
  console.log("=" .repeat(60));
  
  const startTime = Date.now();
  const results: Record<string, number | string | { states: number; lgas: number; wards: number }> = {};
  
  try {
    // 0. Seed Administrative Divisions (MUST BE FIRST - users depend on this)
    console.log("\n🗺️  Step 1/7: Seeding Administrative Divisions");
    console.log("-".repeat(60));
    try {
      const adminCounts = await seedAdminComplete();
      results.adminComplete = `${adminCounts.states} states, ${adminCounts.lgas} LGAs, ${adminCounts.wards} wards`;
      console.log(`✅ Admin divisions seeding completed: ${results.adminComplete}`);
    } catch (error) {
      console.error("❌ Admin divisions seeding failed:", error);
      results.adminComplete = "FAILED";
      throw error;
    }
    
    // 1. Seed Electoral System
    console.log("\n🗳️  Step 2/7: Seeding Electoral System Data");
    console.log("-".repeat(60));
    try {
      const electoralCount = await seedElectoral();
      results.electoral = electoralCount;
      console.log(`✅ Electoral system seeding completed: ${electoralCount} records`);
    } catch (error) {
      console.error("❌ Electoral system seeding failed:", error);
      results.electoral = "FAILED";
      throw error;
    }
    
    // 2. Seed Quiz Questions
    console.log("\n📚 Step 3/7: Seeding Quiz Questions");
    console.log("-".repeat(60));
    try {
      const quizCount = await seedQuiz();
      results.quiz = quizCount;
      console.log(`✅ Quiz seeding completed: ${quizCount} questions`);
    } catch (error) {
      console.error("❌ Quiz seeding failed:", error);
      results.quiz = "FAILED";
      throw error;
    }
    
    // 3. Seed Users and Members
    console.log("\n👥 Step 4/7: Seeding Users and Members");
    console.log("-".repeat(60));
    try {
      const usersCount = await seedUsers(5000);
      results.users = usersCount;
      console.log(`✅ Users seeding completed: ${usersCount} users`);
    } catch (error) {
      console.error("❌ Users seeding failed:", error);
      results.users = "FAILED";
      throw error;
    }
    
    // 4. Seed Campaigns
    console.log("\n📢 Step 5/7: Seeding Political Campaigns");
    console.log("-".repeat(60));
    try {
      const campaignsCount = await seedCampaigns(75);
      results.campaigns = campaignsCount;
      console.log(`✅ Campaigns seeding completed: ${campaignsCount} campaigns`);
    } catch (error) {
      console.error("❌ Campaigns seeding failed:", error);
      results.campaigns = "FAILED";
      throw error;
    }
    
    // 5. Seed Events
    console.log("\n📅 Step 6/7: Seeding Political Events");
    console.log("-".repeat(60));
    try {
      const eventsCount = await seedEvents(250);
      results.events = eventsCount;
      console.log(`✅ Events seeding completed: ${eventsCount} events`);
    } catch (error) {
      console.error("❌ Events seeding failed:", error);
      results.events = "FAILED";
      throw error;
    }
    
    // 6. Seed Knowledge Base
    console.log("\n📚 Step 7/7: Seeding Political Facts & Quotes");
    console.log("-".repeat(60));
    try {
      const knowledgeCount = await seedKnowledge();
      results.knowledge = knowledgeCount;
      console.log(`✅ Knowledge base seeding completed: ${knowledgeCount} items`);
    } catch (error) {
      console.error("❌ Knowledge base seeding failed:", error);
      results.knowledge = "FAILED";
      throw error;
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📊 Seeding Summary:");
    console.log(`  • Administrative Divisions: ${results.adminComplete}`);
    console.log(`  • Electoral System: ${results.electoral} records`);
    console.log(`  • Quiz Questions: ${results.quiz}`);
    console.log(`  • Users & Members: ${results.users}`);
    console.log(`  • Political Campaigns: ${results.campaigns}`);
    console.log(`  • Political Events: ${results.events}`);
    console.log(`  • Political Facts & Quotes: ${results.knowledge}`);
    console.log(`\n⏱️  Total Time: ${duration} seconds`);
    console.log("\n✨ Your APC Connect database is now ready for action!");
    console.log("=" .repeat(60) + "\n");
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.error("❌ DATABASE SEEDING FAILED");
    console.log("=".repeat(60));
    console.log("\n📊 Partial Results:");
    console.log(`  • Administrative Divisions: ${results.adminComplete || "NOT STARTED"}`);
    console.log(`  • Electoral System: ${results.electoral || "NOT STARTED"}`);
    console.log(`  • Quiz Questions: ${results.quiz || "NOT STARTED"}`);
    console.log(`  • Users & Members: ${results.users || "NOT STARTED"}`);
    console.log(`  • Political Campaigns: ${results.campaigns || "NOT STARTED"}`);
    console.log(`  • Political Events: ${results.events || "NOT STARTED"}`);
    console.log(`  • Political Facts & Quotes: ${results.knowledge || "NOT STARTED"}`);
    console.log(`\n⏱️  Time Before Failure: ${duration} seconds`);
    console.log("\n💡 Fix the error and run the seeding again.");
    console.log("=" .repeat(60) + "\n");
    
    process.exit(1);
  }
}

async function runDemoSeeds() {
  console.log("🎯 Starting COMPREHENSIVE DEMO DATA Seeding...\n");
  console.log("=" .repeat(60));
  console.log("This will populate all platform features with realistic demo data:");
  console.log("  • Donations & Campaigns");
  console.log("  • Tasks & Task Completions");
  console.log("  • Campaign Votes");
  console.log("  • Event Attendance");
  console.log("  • Points & Gamification");
  console.log("=" .repeat(60) + "\n");
  
  const startTime = Date.now();
  const results: Record<string, any> = {};
  
  try {
    // Step 1: Seed Donations
    console.log("\n💰 Step 1/5: Seeding Donations & Campaigns");
    console.log("-".repeat(60));
    try {
      const donationCounts = await seedDonations();
      results.donations = donationCounts;
      console.log(`✅ Donations seeding completed: ${donationCounts.campaigns} campaigns, ${donationCounts.donations} donations`);
    } catch (error) {
      console.error("❌ Donations seeding failed:", error);
      results.donations = "FAILED";
      throw error;
    }
    
    // Step 2: Seed Tasks & Completions
    console.log("\n📋 Step 2/5: Seeding Tasks & Completions");
    console.log("-".repeat(60));
    try {
      const taskCounts = await seedTasksDemo();
      results.tasks = taskCounts;
      console.log(`✅ Tasks seeding completed: ${taskCounts.microTasks} micro tasks, ${taskCounts.volunteerTasks} volunteer tasks, ${taskCounts.completions} completions`);
    } catch (error) {
      console.error("❌ Tasks seeding failed:", error);
      results.tasks = "FAILED";
      throw error;
    }
    
    // Step 3: Seed Campaign Votes
    console.log("\n🗳️  Step 3/5: Seeding Campaign Votes");
    console.log("-".repeat(60));
    try {
      const voteCounts = await seedCampaignVotes();
      results.votes = voteCounts;
      console.log(`✅ Campaign votes seeding completed: ${voteCounts.votes} votes`);
    } catch (error) {
      console.error("❌ Campaign votes seeding failed:", error);
      results.votes = "FAILED";
      throw error;
    }
    
    // Step 4: Seed Event Attendance
    console.log("\n🎫 Step 4/5: Seeding Event Attendance");
    console.log("-".repeat(60));
    try {
      const attendanceCounts = await seedEventsAttendance();
      results.attendance = attendanceCounts;
      console.log(`✅ Event attendance seeding completed: ${attendanceCounts.rsvps} RSVPs`);
    } catch (error) {
      console.error("❌ Event attendance seeding failed:", error);
      results.attendance = "FAILED";
      throw error;
    }
    
    // Step 5: Seed Points Activity
    console.log("\n⭐ Step 5/5: Awarding Points for All Activities");
    console.log("-".repeat(60));
    try {
      const pointsCounts = await seedPointsActivity();
      results.points = pointsCounts;
      console.log(`✅ Points activity seeding completed: ${pointsCounts.totalEntries} point entries`);
    } catch (error) {
      console.error("❌ Points activity seeding failed:", error);
      results.points = "FAILED";
      throw error;
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEMO DATA SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📊 Demo Data Summary:");
    console.log(`  • Donations: ${results.donations.campaigns} campaigns, ${results.donations.donations} donations`);
    console.log(`  • Tasks: ${results.tasks.microTasks} micro + ${results.tasks.volunteerTasks} volunteer = ${results.tasks.microTasks + results.tasks.volunteerTasks} total`);
    console.log(`  • Task Completions: ${results.tasks.completions}`);
    console.log(`  • Campaign Votes: ${results.votes.votes}`);
    console.log(`  • Event RSVPs: ${results.attendance.rsvps}`);
    console.log(`  • Point Entries: ${results.points.totalEntries}`);
    console.log(`\n⏱️  Total Time: ${duration} seconds`);
    console.log("\n✨ Your APC Connect platform now has comprehensive demo data!");
    console.log("=" .repeat(60) + "\n");
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.error("❌ DEMO DATA SEEDING FAILED");
    console.log("=".repeat(60));
    console.log("\n📊 Partial Results:");
    console.log(`  • Donations: ${results.donations || "NOT STARTED"}`);
    console.log(`  • Tasks: ${results.tasks || "NOT STARTED"}`);
    console.log(`  • Campaign Votes: ${results.votes || "NOT STARTED"}`);
    console.log(`  • Event Attendance: ${results.attendance || "NOT STARTED"}`);
    console.log(`  • Points Activity: ${results.points || "NOT STARTED"}`);
    console.log(`\n⏱️  Time Before Failure: ${duration} seconds`);
    console.log("\n💡 Fix the error and run the demo seeding again.");
    console.log("=" .repeat(60) + "\n");
    
    process.exit(1);
  }
}

async function runSelectiveSeeds(options: SeedOptions) {
  console.log("🌱 Running Selective Database Seeding...\n");
  console.log("=" .repeat(60));
  
  const startTime = Date.now();
  
  try {
    if (options.adminComplete) {
      console.log("\n🗺️  Seeding Administrative Divisions");
      console.log("-".repeat(60));
      const counts = await seedAdminComplete();
      console.log(`✅ Completed: ${counts.states} states, ${counts.lgas} LGAs, ${counts.wards} wards\n`);
    }
    
    if (options.electoral) {
      console.log("\n🗳️  Seeding Electoral System Data");
      console.log("-".repeat(60));
      const count = await seedElectoral();
      console.log(`✅ Completed: ${count} records\n`);
    }
    
    if (options.quiz) {
      console.log("\n📚 Seeding Quiz Questions");
      console.log("-".repeat(60));
      const count = await seedQuiz();
      console.log(`✅ Completed: ${count} questions\n`);
    }
    
    if (options.users) {
      console.log("\n👥 Seeding Users and Members");
      console.log("-".repeat(60));
      const count = await seedUsers();
      console.log(`✅ Completed: ${count} users\n`);
    }
    
    if (options.campaigns) {
      console.log("\n📢 Seeding Political Campaigns");
      console.log("-".repeat(60));
      const count = await seedCampaigns();
      console.log(`✅ Completed: ${count} campaigns\n`);
    }
    
    if (options.events) {
      console.log("\n📅 Seeding Political Events");
      console.log("-".repeat(60));
      const count = await seedEvents();
      console.log(`✅ Completed: ${count} events\n`);
    }
    
    if (options.knowledge) {
      console.log("\n📚 Seeding Political Facts & Quotes");
      console.log("-".repeat(60));
      const count = await seedKnowledge();
      console.log(`✅ Completed: ${count} items\n`);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("=".repeat(60));
    console.log(`✅ Selective seeding completed in ${duration} seconds`);
    console.log("=" .repeat(60) + "\n");
    
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes("--demo")) {
  // Run demo data seeding
  runDemoSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.length === 0 || args.includes("--all")) {
  // Run all seeds
  runAllSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Run selective seeds based on flags
  const options: SeedOptions = {
    adminComplete: args.includes("--admin-complete"),
    electoral: args.includes("--electoral"),
    quiz: args.includes("--quiz"),
    users: args.includes("--users"),
    campaigns: args.includes("--campaigns"),
    events: args.includes("--events"),
    knowledge: args.includes("--knowledge"),
  };
  
  if (!options.adminComplete && !options.electoral && !options.quiz && !options.users && !options.campaigns && !options.events && !options.knowledge) {
    console.error("❌ No valid seed options provided!");
    console.log("\nUsage:");
    console.log("  tsx server/seed/index.ts [options]");
    console.log("\nOptions:");
    console.log("  --all              Run all seeders (default)");
    console.log("  --demo             Run comprehensive demo data seeding (donations, tasks, votes, attendance, points)");
    console.log("  --admin-complete   Seed states, LGAs, and wards only");
    console.log("  --electoral        Seed electoral system data only");
    console.log("  --quiz             Seed quiz questions only");
    console.log("  --users            Seed users and members only");
    console.log("  --campaigns        Seed political campaigns only");
    console.log("  --events           Seed political events only");
    console.log("  --knowledge        Seed political facts & quotes only");
    console.log("\nExamples:");
    console.log("  tsx server/seed/index.ts                              # Run all");
    console.log("  tsx server/seed/index.ts --all                        # Run all");
    console.log("  tsx server/seed/index.ts --demo                       # Run comprehensive demo data");
    console.log("  tsx server/seed/index.ts --admin-complete --electoral # Run admin & electoral only");
    console.log("  tsx server/seed/index.ts --quiz --users               # Run quiz and users only");
    console.log("  tsx server/seed/index.ts --knowledge                  # Run knowledge base only");
    process.exit(1);
  }
  
  runSelectiveSeeds(options)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
