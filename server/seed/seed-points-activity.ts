import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function seedPointsActivity() {
  console.log("⭐ Seeding Points for All Activities...");
  
  const pointsToCreate: schema.InsertUserPoint[] = [];
  
  // 1. Award points for quiz attempts (already have pointsEarned)
  console.log("  Processing quiz attempts...");
  const quizAttempts = await db.select()
    .from(schema.quizAttempts)
    .where(sql`${schema.quizAttempts.isCorrect} = true`);
  
  console.log(`  Found ${quizAttempts.length} correct quiz attempts`);
  
  for (const attempt of quizAttempts) {
    if (attempt.pointsEarned && attempt.pointsEarned > 0) {
      pointsToCreate.push({
        memberId: attempt.memberId,
        points: attempt.pointsEarned,
        source: "quiz",
        amount: attempt.pointsEarned,
      } as schema.InsertUserPoint);
    }
  }
  
  // 2. Award points for approved task completions
  console.log("  Processing task completions...");
  const taskCompletions = await db.select()
    .from(schema.taskCompletions)
    .where(eq(schema.taskCompletions.status, "approved"));
  
  console.log(`  Found ${taskCompletions.length} approved task completions`);
  
  for (const completion of taskCompletions) {
    if (completion.pointsEarned && completion.pointsEarned > 0) {
      const source = completion.taskType === "micro" ? "micro_task" : "volunteer_task";
      pointsToCreate.push({
        memberId: completion.memberId,
        points: completion.pointsEarned,
        source,
        amount: completion.pointsEarned,
      } as schema.InsertUserPoint);
    }
  }
  
  // 3. Award points for event attendance (5 points per RSVP)
  console.log("  Processing event RSVPs...");
  const eventRsvps = await db.select()
    .from(schema.eventRsvps)
    .where(eq(schema.eventRsvps.status, "confirmed"));
  
  console.log(`  Found ${eventRsvps.length} confirmed event RSVPs`);
  const EVENT_ATTENDANCE_POINTS = 25;
  
  for (const rsvp of eventRsvps) {
    pointsToCreate.push({
      memberId: rsvp.memberId,
      points: EVENT_ATTENDANCE_POINTS,
      source: "event_attendance",
      amount: EVENT_ATTENDANCE_POINTS,
    } as schema.InsertUserPoint);
  }
  
  // 4. Award points for campaign votes (2 points per vote)
  console.log("  Processing campaign votes...");
  const campaignVotes = await db.select().from(schema.campaignVotes);
  
  console.log(`  Found ${campaignVotes.length} campaign votes`);
  const CAMPAIGN_VOTE_POINTS = 5;
  
  for (const vote of campaignVotes) {
    pointsToCreate.push({
      memberId: vote.memberId,
      points: CAMPAIGN_VOTE_POINTS,
      source: "campaign_vote",
      amount: CAMPAIGN_VOTE_POINTS,
    } as schema.InsertUserPoint);
  }
  
  // 5. Award points for referrals (100 points per successful referral)
  console.log("  Processing referrals...");
  const members = await db.select().from(schema.members);
  const membersWithReferrals = members.filter(m => m.referredBy);
  
  console.log(`  Found ${membersWithReferrals.length} referred members`);
  const REFERRAL_POINTS = 100;
  
  // Group by referrer
  const referralCounts: Record<string, number> = {};
  for (const member of membersWithReferrals) {
    if (member.referredBy) {
      referralCounts[member.referredBy] = (referralCounts[member.referredBy] || 0) + 1;
    }
  }
  
  for (const [referrerId, count] of Object.entries(referralCounts)) {
    pointsToCreate.push({
      memberId: referrerId,
      points: REFERRAL_POINTS * count,
      source: "referral",
      amount: REFERRAL_POINTS * count,
    } as schema.InsertUserPoint);
  }
  
  // 6. Award bonus points for social sharing (simulate some members sharing content)
  console.log("  Simulating social sharing points...");
  const SHARE_POINTS = 10;
  const activeMembersForSharing = members.slice(0, Math.floor(members.length * 0.3)); // 30% of members share
  
  for (const member of activeMembersForSharing) {
    const shareCount = Math.floor(Math.random() * 5) + 1; // 1-5 shares per active member
    pointsToCreate.push({
      memberId: member.id,
      points: SHARE_POINTS * shareCount,
      source: "social_share",
      amount: SHARE_POINTS * shareCount,
    } as schema.InsertUserPoint);
  }
  
  console.log(`  Simulated ${activeMembersForSharing.length * 3} social shares (avg 3 per active member)`);
  
  // Insert all points in batches
  console.log(`\n  Total points entries to insert: ${pointsToCreate.length}`);
  const batchSize = 200;
  let insertedPoints = 0;
  
  for (let i = 0; i < pointsToCreate.length; i += batchSize) {
    const batch = pointsToCreate.slice(i, i + batchSize);
    await db.insert(schema.userPoints).values(batch as any);
    insertedPoints += batch.length;
    console.log(`  Inserted ${insertedPoints}/${pointsToCreate.length} point entries`);
  }
  
  // Calculate total points per member and display top earners
  console.log("\n  Calculating member point totals...");
  
  const memberPointTotals = await db
    .select({
      memberId: schema.userPoints.memberId,
      totalPoints: sql<number>`SUM(${schema.userPoints.amount})`.as('total_points'),
    })
    .from(schema.userPoints)
    .groupBy(schema.userPoints.memberId)
    .orderBy(sql`SUM(${schema.userPoints.amount}) DESC`)
    .limit(10);
  
  console.log("\n  🏆 Top 10 Point Earners:");
  for (let i = 0; i < memberPointTotals.length; i++) {
    const memberTotal = memberPointTotals[i];
    console.log(`     ${i + 1}. Member ${memberTotal.memberId.substring(0, 8)}... - ${memberTotal.totalPoints} points`);
  }
  
  // Calculate breakdown by source
  const pointsBySource = await db
    .select({
      source: schema.userPoints.source,
      totalPoints: sql<number>`SUM(${schema.userPoints.amount})`.as('total_points'),
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(schema.userPoints)
    .groupBy(schema.userPoints.source);
  
  console.log("\n  📊 Points Breakdown by Source:");
  for (const sourceData of pointsBySource) {
    console.log(`     ${sourceData.source}: ${sourceData.totalPoints} points (${sourceData.count} entries)`);
  }
  
  console.log(`\n✅ Successfully seeded ${insertedPoints} point entries!`);
  
  return {
    totalEntries: insertedPoints,
    bySource: pointsBySource,
    topEarners: memberPointTotals.length,
  };
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-points-activity');

if (isMainModule) {
  seedPointsActivity()
    .then((counts) => {
      console.log(`\n🎉 Points activity seeding completed!`);
      console.log(`  Total Point Entries: ${counts.totalEntries}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Points activity seeding failed:", error);
      process.exit(1);
    });
}
