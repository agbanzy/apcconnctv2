import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";

const donationCampaignTemplates = [
  {
    title: "APC Youth Empowerment Fund",
    description: "Supporting young entrepreneurs with grants, training, and mentorship. Help us create opportunities for the next generation of business leaders.",
    category: "youth_programs" as const,
    goalAmount: 500000000, // 5,000,000 NGN in kobo
  },
  {
    title: "Community Infrastructure Development",
    description: "Building boreholes, solar lights, and community centers in underserved areas. Every contribution makes a difference.",
    category: "infrastructure" as const,
    goalAmount: 1000000000, // 10,000,000 NGN
  },
  {
    title: "Emergency Relief for Northern Communities",
    description: "Providing food, shelter, and medical supplies to families affected by security challenges in Northern Nigeria.",
    category: "emergency_relief" as const,
    goalAmount: 300000000, // 3,000,000 NGN
  },
  {
    title: "Rural Electrification Project",
    description: "Bringing electricity to rural communities through solar panels and mini-grids. Power for progress.",
    category: "infrastructure" as const,
    goalAmount: 750000000, // 7,500,000 NGN
  },
  {
    title: "Back-to-School Initiative",
    description: "Providing school supplies, uniforms, and tuition support for children from low-income families.",
    category: "community_development" as const,
    goalAmount: 200000000, // 2,000,000 NGN
  },
  {
    title: "2027 Campaign War Chest",
    description: "Building a strong campaign foundation for the upcoming elections. Support grassroots mobilization and voter education.",
    category: "campaign" as const,
    goalAmount: 2000000000, // 20,000,000 NGN
  },
  {
    title: "Women's Economic Empowerment",
    description: "Providing microloans and business training to women entrepreneurs across Nigeria.",
    category: "community_development" as const,
    goalAmount: 400000000, // 4,000,000 NGN
  },
  {
    title: "Healthcare for All",
    description: "Supporting free medical outreach programs and building primary healthcare centers in rural areas.",
    category: "community_development" as const,
    goalAmount: 600000000, // 6,000,000 NGN
  },
  {
    title: "Skills Training Centers",
    description: "Establishing vocational training centers for tech, tailoring, welding, and other skills.",
    category: "youth_programs" as const,
    goalAmount: 450000000, // 4,500,000 NGN
  },
  {
    title: "General Party Operations",
    description: "Supporting day-to-day party operations, office rent, staff salaries, and administrative expenses.",
    category: "general" as const,
    goalAmount: 150000000, // 1,500,000 NGN
  },
];

function getRandomPaymentStatus(): "pending" | "completed" | "failed" {
  const rand = Math.random();
  if (rand < 0.75) return "completed"; // 75% successful
  if (rand < 0.90) return "pending"; // 15% pending
  return "failed"; // 10% failed
}

function generatePaystackReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "PST-";
  for (let i = 0; i < 12; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

function getRandomDonationAmount(): number {
  const amounts = [
    100000,    // 1,000 NGN
    200000,    // 2,000 NGN
    500000,    // 5,000 NGN
    1000000,   // 10,000 NGN
    2000000,   // 20,000 NGN
    5000000,   // 50,000 NGN
    10000000,  // 100,000 NGN
    20000000,  // 200,000 NGN
    50000000,  // 500,000 NGN
  ];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

export async function seedDonations() {
  console.log("💰 Seeding Donation Campaigns and Transactions...");
  
  // Get first admin user as campaign creator
  const adminUsers = await db.select()
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);
  
  if (adminUsers.length === 0) {
    console.log("⚠️ No admin users found. Creating campaigns without creator.");
  }
  
  const creatorId = adminUsers[0]?.id;
  
  // Get all members for donations
  const allMembers = await db.select().from(schema.members).limit(200);
  console.log(`  Found ${allMembers.length} members for donations`);
  
  if (allMembers.length === 0) {
    throw new Error("No members found! Please seed users first.");
  }
  
  // Create donation campaigns
  console.log(`  Creating ${donationCampaignTemplates.length} donation campaigns...`);
  const campaigns: typeof schema.donationCampaigns.$inferSelect[] = [];
  
  for (const template of donationCampaignTemplates) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Started 0-30 days ago
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 60) + 30); // Ends 30-90 days from now
    
    const [campaign] = await db.insert(schema.donationCampaigns).values({
      title: template.title,
      description: template.description,
      category: template.category,
      goalAmount: template.goalAmount,
      currentAmount: 0,
      status: "active",
      startDate,
      endDate,
      createdBy: creatorId || adminUsers[0]?.id,
    } as schema.InsertDonationCampaign).returning();
    
    campaigns.push(campaign);
  }
  
  console.log(`✅ Created ${campaigns.length} donation campaigns`);
  
  // Create 50+ donation transactions
  console.log("  Creating donation transactions...");
  const donationsToCreate: schema.InsertDonation[] = [];
  const targetDonations = 75; // More than 50 for variety
  
  for (let i = 0; i < targetDonations; i++) {
    const member = allMembers[Math.floor(Math.random() * allMembers.length)];
    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
    const amount = getRandomDonationAmount();
    const paymentStatus = getRandomPaymentStatus();
    const isAnonymous = Math.random() < 0.15; // 15% anonymous
    
    // Get user details for donor name and email
    const [userDetails] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, member.userId))
      .limit(1);
    
    const donation: schema.InsertDonation = {
      memberId: isAnonymous ? undefined : member.id,
      donorName: isAnonymous ? "Anonymous Donor" : `${userDetails.firstName} ${userDetails.lastName}`,
      donorEmail: isAnonymous ? undefined : userDetails.email,
      campaignId: campaign.id,
      amount,
      currency: "NGN",
      paymentMethod: "paystack",
      paymentStatus,
      paystackReference: paymentStatus !== "pending" ? generatePaystackReference() : undefined,
      isAnonymous,
      isRecurring: Math.random() < 0.1, // 10% recurring
      recurringFrequency: Math.random() < 0.1 ? (Math.random() < 0.5 ? "monthly" : "quarterly") : undefined,
      message: Math.random() < 0.3 ? "Keep up the good work! Nigeria needs APC." : undefined,
    };
    
    donationsToCreate.push(donation);
  }
  
  // Insert donations in batches
  const batchSize = 25;
  let insertedDonations = 0;
  
  for (let i = 0; i < donationsToCreate.length; i += batchSize) {
    const batch = donationsToCreate.slice(i, i + batchSize);
    await db.insert(schema.donations).values(batch as any);
    insertedDonations += batch.length;
    console.log(`  Inserted ${insertedDonations}/${donationsToCreate.length} donations`);
  }
  
  // Update campaign currentAmount based on completed donations
  console.log("  Updating campaign totals...");
  for (const campaign of campaigns) {
    const completedDonations = await db.select()
      .from(schema.donations)
      .where(eq(schema.donations.campaignId, campaign.id));
    
    const totalAmount = completedDonations
      .filter(d => d.paymentStatus === "completed")
      .reduce((sum, d) => sum + d.amount, 0);
    
    await db.update(schema.donationCampaigns)
      .set({ currentAmount: totalAmount })
      .where(eq(schema.donationCampaigns.id, campaign.id));
  }
  
  console.log(`✅ Successfully seeded ${campaigns.length} campaigns and ${insertedDonations} donations!`);
  
  return {
    campaigns: campaigns.length,
    donations: insertedDonations,
  };
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-donations');

if (isMainModule) {
  seedDonations()
    .then((counts) => {
      console.log(`\n🎉 Donation seeding completed!`);
      console.log(`  Campaigns: ${counts.campaigns}`);
      console.log(`  Donations: ${counts.donations}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Donation seeding failed:", error);
      process.exit(1);
    });
}
