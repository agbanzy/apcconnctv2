import { seedQuiz } from "./seed-quiz";
import { seedUsers } from "./seed-users";
import { seedCampaigns } from "./seed-campaigns";
import { seedEvents } from "./seed-events";

interface SeedOptions {
  quiz?: boolean;
  users?: boolean;
  campaigns?: boolean;
  events?: boolean;
  all?: boolean;
}

async function runAllSeeds() {
  console.log("🌱 Starting APC Connect Database Seeding...\n");
  console.log("=" .repeat(60));
  
  const startTime = Date.now();
  const results: Record<string, number | string> = {};
  
  try {
    // 1. Seed Quiz Questions
    console.log("\n📚 Step 1/4: Seeding Quiz Questions");
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
    
    // 2. Seed Users and Members
    console.log("\n👥 Step 2/4: Seeding Users and Members");
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
    
    // 3. Seed Campaigns
    console.log("\n📢 Step 3/4: Seeding Political Campaigns");
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
    
    // 4. Seed Events
    console.log("\n📅 Step 4/4: Seeding Political Events");
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
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📊 Seeding Summary:");
    console.log(`  • Quiz Questions: ${results.quiz}`);
    console.log(`  • Users & Members: ${results.users}`);
    console.log(`  • Political Campaigns: ${results.campaigns}`);
    console.log(`  • Political Events: ${results.events}`);
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
    console.log(`  • Quiz Questions: ${results.quiz || "NOT STARTED"}`);
    console.log(`  • Users & Members: ${results.users || "NOT STARTED"}`);
    console.log(`  • Political Campaigns: ${results.campaigns || "NOT STARTED"}`);
    console.log(`  • Political Events: ${results.events || "NOT STARTED"}`);
    console.log(`\n⏱️  Time Before Failure: ${duration} seconds`);
    console.log("\n💡 Fix the error and run the seeding again.");
    console.log("=" .repeat(60) + "\n");
    
    process.exit(1);
  }
}

async function runSelectiveSeeds(options: SeedOptions) {
  console.log("🌱 Running Selective Database Seeding...\n");
  console.log("=" .repeat(60));
  
  const startTime = Date.now();
  
  try {
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

if (args.length === 0 || args.includes("--all")) {
  // Run all seeds
  runAllSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Run selective seeds based on flags
  const options: SeedOptions = {
    quiz: args.includes("--quiz"),
    users: args.includes("--users"),
    campaigns: args.includes("--campaigns"),
    events: args.includes("--events"),
  };
  
  if (!options.quiz && !options.users && !options.campaigns && !options.events) {
    console.error("❌ No valid seed options provided!");
    console.log("\nUsage:");
    console.log("  tsx server/seed/index.ts [options]");
    console.log("\nOptions:");
    console.log("  --all           Run all seeders (default)");
    console.log("  --quiz          Seed quiz questions only");
    console.log("  --users         Seed users and members only");
    console.log("  --campaigns     Seed political campaigns only");
    console.log("  --events        Seed political events only");
    console.log("\nExamples:");
    console.log("  tsx server/seed/index.ts                    # Run all");
    console.log("  tsx server/seed/index.ts --all              # Run all");
    console.log("  tsx server/seed/index.ts --quiz --users     # Run quiz and users only");
    process.exit(1);
  }
  
  runSelectiveSeeds(options)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
