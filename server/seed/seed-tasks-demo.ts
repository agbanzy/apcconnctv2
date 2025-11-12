import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";

// Micro Tasks (Social media, awareness, recruitment)
const microTaskTemplates = [
  {
    title: "Share APC's Latest Achievement",
    description: "Share the party's recent infrastructure project completion on your social media with #APCDelivers",
    category: "social_media",
    points: 15,
    timeEstimate: "2 minutes",
  },
  {
    title: "Tweet About Youth Empowerment",
    description: "Post about APC's youth empowerment programs using #APCYouthPower",
    category: "social_media",
    points: 15,
    timeEstimate: "3 minutes",
  },
  {
    title: "Instagram Story - Party Events",
    description: "Share photos from recent APC events on your Instagram story",
    category: "social_media",
    points: 20,
    timeEstimate: "5 minutes",
  },
  {
    title: "Facebook Post - Campaign Support",
    description: "Write a post supporting APC's campaign initiatives on Facebook",
    category: "social_media",
    points: 20,
    timeEstimate: "5 minutes",
  },
  {
    title: "WhatsApp Status Update",
    description: "Share APC's achievements as your WhatsApp status",
    category: "social_media",
    points: 10,
    timeEstimate: "1 minute",
  },
  {
    title: "Educate 5 People on Party Policies",
    description: "Have conversations with 5 people about APC's policies and vision",
    category: "awareness",
    points: 50,
    timeEstimate: "30 minutes",
  },
  {
    title: "Distribute Party Flyers",
    description: "Distribute 20 party flyers in your community",
    category: "awareness",
    points: 30,
    timeEstimate: "20 minutes",
  },
  {
    title: "Attend Ward Meeting",
    description: "Attend your ward's monthly APC meeting",
    category: "awareness",
    points: 40,
    timeEstimate: "2 hours",
  },
  {
    title: "Recruit 3 New Members",
    description: "Register 3 new members to join the APC Connect platform",
    category: "recruitment",
    points: 100,
    timeEstimate: "1 hour",
  },
  {
    title: "Invite Friends to Platform",
    description: "Send invitation links to 10 contacts to join APC Connect",
    category: "recruitment",
    points: 25,
    timeEstimate: "10 minutes",
  },
  {
    title: "Voter Registration Drive",
    description: "Help register 5 new voters in your community",
    category: "recruitment",
    points: 75,
    timeEstimate: "3 hours",
  },
  {
    title: "Social Media Campaign Boost",
    description: "Like, comment, and share 10 official APC posts",
    category: "social_media",
    points: 20,
    timeEstimate: "15 minutes",
  },
  {
    title: "Community Survey",
    description: "Complete a survey about community needs and priorities",
    category: "awareness",
    points: 30,
    timeEstimate: "10 minutes",
  },
  {
    title: "Party Manifesto Quiz",
    description: "Take and pass the APC manifesto quiz with 80% score",
    category: "awareness",
    points: 35,
    timeEstimate: "15 minutes",
  },
  {
    title: "Youth Forum Participation",
    description: "Participate in online youth forum discussion",
    category: "awareness",
    points: 25,
    timeEstimate: "30 minutes",
  },
  {
    title: "TikTok Challenge",
    description: "Create a TikTok video promoting APC values with #APCNigeria",
    category: "social_media",
    points: 40,
    timeEstimate: "15 minutes",
  },
  {
    title: "LinkedIn Post - Professional Network",
    description: "Share APC's economic policies on LinkedIn",
    category: "social_media",
    points: 25,
    timeEstimate: "10 minutes",
  },
  {
    title: "Campus Ambassador",
    description: "Organize a campus discussion about APC policies",
    category: "awareness",
    points: 60,
    timeEstimate: "2 hours",
  },
  {
    title: "Door-to-Door Campaign",
    description: "Visit 20 households to discuss party vision",
    category: "recruitment",
    points: 80,
    timeEstimate: "3 hours",
  },
  {
    title: "Online Forum Defender",
    description: "Respond to misinformation about APC in online forums with facts",
    category: "awareness",
    points: 45,
    timeEstimate: "30 minutes",
  },
];

// Volunteer Tasks (larger, more involved)
const volunteerTaskTemplates = [
  {
    title: "Event Setup Crew - Lagos Rally",
    description: "Help set up stage, chairs, and sound system for upcoming Lagos rally. Physical labor required.",
    category: "event",
    location: "Lagos State",
    skills: ["Physical Fitness", "Teamwork"],
    points: 100,
    difficulty: "Easy" as const,
    maxVolunteers: 20,
  },
  {
    title: "Campaign Coordinator - Kano",
    description: "Coordinate grassroots campaign activities in Kano Central. Requires leadership and organizational skills.",
    category: "campaign",
    location: "Kano State",
    skills: ["Leadership", "Communication", "Organization"],
    points: 200,
    difficulty: "Hard" as const,
    maxVolunteers: 2,
  },
  {
    title: "Social Media Manager - Youth Wing",
    description: "Manage social media accounts for APC Youth Wing. Create content, engage followers, track metrics.",
    category: "outreach",
    location: "Remote",
    skills: ["Social Media", "Content Creation", "Analytics"],
    points: 150,
    difficulty: "Medium" as const,
    maxVolunteers: 3,
  },
  {
    title: "Community Health Outreach",
    description: "Assist in organizing free medical camp in rural communities. Help with registration and crowd management.",
    category: "outreach",
    location: "Kaduna State",
    skills: ["Communication", "Organization"],
    points: 120,
    difficulty: "Medium" as const,
    maxVolunteers: 15,
  },
  {
    title: "Voter Education Workshop Facilitator",
    description: "Conduct voter education workshops in communities. Train people on voting process and civic responsibilities.",
    category: "education",
    location: "Oyo State",
    skills: ["Public Speaking", "Teaching"],
    points: 180,
    difficulty: "Hard" as const,
    maxVolunteers: 5,
  },
  {
    title: "Tech Support for Digital Membership",
    description: "Help members register and navigate the APC Connect platform. Remote support via phone/WhatsApp.",
    category: "support",
    location: "Remote",
    skills: ["Technical Support", "Communication"],
    points: 90,
    difficulty: "Easy" as const,
    maxVolunteers: 10,
  },
  {
    title: "Graphic Designer for Campaign Materials",
    description: "Design posters, flyers, and social media graphics for campaign activities.",
    category: "campaign",
    location: "Remote",
    skills: ["Graphic Design", "Adobe Photoshop", "Canva"],
    points: 160,
    difficulty: "Medium" as const,
    maxVolunteers: 4,
  },
  {
    title: "Data Entry for Membership Database",
    description: "Help digitize paper membership forms into the database system.",
    category: "administration",
    location: "Abuja",
    skills: ["Data Entry", "Attention to Detail"],
    points: 80,
    difficulty: "Easy" as const,
    maxVolunteers: 8,
  },
  {
    title: "Event Photographer",
    description: "Capture photos at party events for social media and archives.",
    category: "event",
    location: "Rivers State",
    skills: ["Photography", "Photo Editing"],
    points: 110,
    difficulty: "Medium" as const,
    maxVolunteers: 3,
  },
  {
    title: "Ward Mobilization Captain",
    description: "Lead grassroots mobilization in your ward. Organize meetings, track member engagement.",
    category: "campaign",
    location: "Various Wards",
    skills: ["Leadership", "Organization", "Communication"],
    points: 250,
    difficulty: "Hard" as const,
    maxVolunteers: 37, // One per state
  },
  {
    title: "Content Writer for Party Blog",
    description: "Write articles about party achievements, policies, and news.",
    category: "outreach",
    location: "Remote",
    skills: ["Writing", "Research"],
    points: 140,
    difficulty: "Medium" as const,
    maxVolunteers: 5,
  },
  {
    title: "Call Center Agent - Member Support",
    description: "Answer member queries via phone and WhatsApp.",
    category: "support",
    location: "Abuja",
    skills: ["Communication", "Customer Service"],
    points: 100,
    difficulty: "Easy" as const,
    maxVolunteers: 12,
  },
  {
    title: "Video Editor for Campaign Videos",
    description: "Edit campaign videos, testimonials, and event highlights.",
    category: "campaign",
    location: "Remote",
    skills: ["Video Editing", "Adobe Premiere", "Final Cut Pro"],
    points: 170,
    difficulty: "Hard" as const,
    maxVolunteers: 3,
  },
  {
    title: "Community Liaison Officer",
    description: "Build relationships with community leaders and organize town halls.",
    category: "outreach",
    location: "Delta State",
    skills: ["Networking", "Communication", "Diplomacy"],
    points: 190,
    difficulty: "Hard" as const,
    maxVolunteers: 4,
  },
  {
    title: "Fundraising Team Member",
    description: "Help organize fundraising events and reach out to potential donors.",
    category: "fundraising",
    location: "Enugu State",
    skills: ["Sales", "Communication", "Persuasion"],
    points: 160,
    difficulty: "Medium" as const,
    maxVolunteers: 6,
  },
];

export async function seedTasksDemo() {
  console.log("📋 Seeding Demo Tasks and Task Completions...");
  
  // Get some members for task completions
  const allMembers = await db.select().from(schema.members).limit(300);
  console.log(`  Found ${allMembers.length} members for task completions`);
  
  if (allMembers.length === 0) {
    throw new Error("No members found! Please seed users first.");
  }
  
  // Create micro tasks
  console.log(`  Creating ${microTaskTemplates.length} micro tasks...`);
  const microTasks: typeof schema.microTasks.$inferSelect[] = [];
  
  for (const template of microTaskTemplates) {
    const [task] = await db.insert(schema.microTasks).values({
      title: template.title,
      description: template.description,
      category: template.category,
      points: template.points,
      timeEstimate: template.timeEstimate,
    } as schema.InsertMicroTask).returning();
    
    microTasks.push(task);
  }
  
  console.log(`✅ Created ${microTasks.length} micro tasks`);
  
  // Create volunteer tasks
  console.log(`  Creating ${volunteerTaskTemplates.length} volunteer tasks...`);
  const volunteerTasks: typeof schema.volunteerTasks.$inferSelect[] = [];
  
  // Get first admin user as creator
  const [adminUser] = await db.select()
    .from(schema.users)
    .where(eq(schema.users.role, "admin"))
    .limit(1);
  
  for (const template of volunteerTaskTemplates) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7)); // Starts 0-7 days from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 30) + 14); // Runs for 14-44 days
    
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() - 3); // Deadline 3 days before start
    
    const [task] = await db.insert(schema.volunteerTasks).values({
      title: template.title,
      description: template.description,
      category: template.category,
      location: template.location,
      skills: template.skills,
      points: template.points,
      startDate,
      endDate,
      deadline,
      difficulty: template.difficulty,
      maxVolunteers: template.maxVolunteers,
      currentVolunteers: 0,
      creatorId: adminUser?.id,
      status: "open",
    } as schema.InsertVolunteerTask).returning();
    
    volunteerTasks.push(task);
  }
  
  console.log(`✅ Created ${volunteerTasks.length} volunteer tasks`);
  
  // Create task completions (100+)
  console.log("  Creating task completions...");
  const completionsToCreate: schema.InsertTaskCompletion[] = [];
  const targetCompletions = 150; // More than 100 for variety
  
  function getRandomStatus(): "pending" | "approved" | "rejected" {
    const rand = Math.random();
    if (rand < 0.65) return "approved"; // 65% approved
    if (rand < 0.85) return "pending"; // 20% pending
    return "rejected"; // 15% rejected
  }
  
  // Distribute completions across micro tasks only (to avoid FK issues)
  // Note: taskCompletions can also track volunteer tasks, but we'll focus on micro tasks for now
  for (let i = 0; i < targetCompletions; i++) {
    const member = allMembers[Math.floor(Math.random() * allMembers.length)];
    const task = microTasks[Math.floor(Math.random() * microTasks.length)];
    const status = getRandomStatus();
    
    completionsToCreate.push({
      taskId: task.id,
      taskType: "micro",
      memberId: member.id,
      status,
      pointsEarned: status === "approved" ? task.points : 0,
      verified: status === "approved",
    } as schema.InsertTaskCompletion);
  }
  
  // Insert completions in batches
  const batchSize = 50;
  let insertedCompletions = 0;
  
  for (let i = 0; i < completionsToCreate.length; i += batchSize) {
    const batch = completionsToCreate.slice(i, i + batchSize);
    await db.insert(schema.taskCompletions).values(batch as any);
    insertedCompletions += batch.length;
    console.log(`  Inserted ${insertedCompletions}/${completionsToCreate.length} task completions`);
  }
  
  console.log(`✅ Successfully seeded tasks and completions!`);
  
  return {
    microTasks: microTasks.length,
    volunteerTasks: volunteerTasks.length,
    completions: insertedCompletions,
  };
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-tasks-demo');

if (isMainModule) {
  seedTasksDemo()
    .then((counts) => {
      console.log(`\n🎉 Tasks demo seeding completed!`);
      console.log(`  Micro Tasks: ${counts.microTasks}`);
      console.log(`  Volunteer Tasks: ${counts.volunteerTasks}`);
      console.log(`  Task Completions: ${counts.completions}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Tasks demo seeding failed:", error);
      process.exit(1);
    });
}
