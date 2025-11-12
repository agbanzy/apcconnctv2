import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";

export async function seedCampaignVotes() {
  console.log("🗳️  Seeding Campaign Votes...");
  
  // Get all active campaigns
  const activeCampaigns = await db.select()
    .from(schema.issueCampaigns)
    .where(eq(schema.issueCampaigns.status, "active"));
  
  console.log(`  Found ${activeCampaigns.length} active campaigns`);
  
  if (activeCampaigns.length === 0) {
    console.log("⚠️ No active campaigns found. Please seed campaigns first.");
    return { votes: 0 };
  }
  
  // Get all members for voting
  const allMembers = await db.select().from(schema.members).limit(600);
  console.log(`  Found ${allMembers.length} members for voting`);
  
  if (allMembers.length === 0) {
    throw new Error("No members found! Please seed users first.");
  }
  
  // Create votes for campaigns
  console.log("  Creating campaign votes...");
  const votesToCreate: schema.InsertCampaignVote[] = [];
  const targetTotalVotes = 600; // 500+ votes as required
  
  // Distribute votes across campaigns
  for (const campaign of activeCampaigns) {
    // Each campaign gets a random number of votes
    const votesForThisCampaign = Math.floor(Math.random() * 50) + 10; // 10-60 votes per campaign
    
    // Randomly select members to vote on this campaign
    const shuffledMembers = [...allMembers].sort(() => Math.random() - 0.5);
    const voters = shuffledMembers.slice(0, Math.min(votesForThisCampaign, allMembers.length));
    
    for (const voter of voters) {
      votesToCreate.push({
        campaignId: campaign.id,
        memberId: voter.id,
      } as schema.InsertCampaignVote);
      
      // Stop if we've reached our target
      if (votesToCreate.length >= targetTotalVotes) {
        break;
      }
    }
    
    if (votesToCreate.length >= targetTotalVotes) {
      break;
    }
  }
  
  console.log(`  Preparing to insert ${votesToCreate.length} votes...`);
  
  // Insert votes in batches
  const batchSize = 100;
  let insertedVotes = 0;
  
  for (let i = 0; i < votesToCreate.length; i += batchSize) {
    const batch = votesToCreate.slice(i, i + batchSize);
    
    try {
      await db.insert(schema.campaignVotes).values(batch as any);
      insertedVotes += batch.length;
      console.log(`  Inserted ${insertedVotes}/${votesToCreate.length} votes`);
    } catch (error: any) {
      // If there's a conflict (member already voted), skip this batch
      if (error.code === '23505') {
        console.log(`  Skipping batch ${i} due to duplicate votes`);
        continue;
      }
      throw error;
    }
  }
  
  // Update campaign vote counts
  console.log("  Updating campaign vote counts...");
  for (const campaign of activeCampaigns) {
    const voteCount = await db.select()
      .from(schema.campaignVotes)
      .where(eq(schema.campaignVotes.campaignId, campaign.id));
    
    await db.update(schema.issueCampaigns)
      .set({ currentVotes: voteCount.length })
      .where(eq(schema.issueCampaigns.id, campaign.id));
  }
  
  console.log(`✅ Successfully seeded ${insertedVotes} campaign votes!`);
  
  return { votes: insertedVotes };
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-campaigns-votes');

if (isMainModule) {
  seedCampaignVotes()
    .then((counts) => {
      console.log(`\n🎉 Campaign votes seeding completed!`);
      console.log(`  Votes Created: ${counts.votes}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Campaign votes seeding failed:", error);
      process.exit(1);
    });
}
