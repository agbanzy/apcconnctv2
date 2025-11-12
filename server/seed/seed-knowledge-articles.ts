import { db } from "../db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedKnowledgeArticles(): Promise<number> {
  console.log("📚 Starting Knowledge Base Articles Seeding...");
  console.log("-".repeat(60));

  try {
    // Get an admin user to be the author
    console.log("\n👤 Finding admin user for article authorship...");
    const adminUser = await db.query.users.findFirst({
      where: sql`${schema.users.role} = 'admin'`
    });

    if (!adminUser) {
      throw new Error("No admin user found. Please seed users first.");
    }
    console.log(`✅ Using admin user: ${adminUser.email}`);

    // Check if data already exists
    console.log("\n🔍 Checking for existing data...");
    const existingCategories = await db.query.knowledgeCategories.findMany();
    const existingArticles = await db.query.knowledgeArticles.findMany();
    const existingFaqs = await db.query.faqs.findMany();
    
    if (existingCategories.length > 0 || existingArticles.length > 0 || existingFaqs.length > 0) {
      console.log(`ℹ️  Found existing data: ${existingCategories.length} categories, ${existingArticles.length} articles, ${existingFaqs.length} FAQs`);
      console.log("⏭️  Skipping knowledge base seeding to preserve existing content");
      return existingCategories.length + existingArticles.length + existingFaqs.length;
    }
    console.log("✅ No existing data found, proceeding with seeding");

    // Seed Categories
    console.log("\n📁 Creating categories...");
    const categories = [
      {
        name: "Party History",
        slug: "party-history",
        description: "Learn about the history and evolution of the APC party",
        icon: "History"
      },
      {
        name: "Governance",
        slug: "governance",
        description: "Understanding APC's approach to governance and policy",
        icon: "Building"
      },
      {
        name: "Getting Started",
        slug: "getting-started",
        description: "New member guides and onboarding resources",
        icon: "Users"
      },
      {
        name: "Party Structure",
        slug: "party-structure",
        description: "Understanding the APC organizational structure",
        icon: "Sitemap"
      },
      {
        name: "Engagement",
        slug: "engagement",
        description: "How to get involved and contribute to the party",
        icon: "Heart"
      }
    ];

    const insertedCategories = await db.insert(schema.knowledgeCategories).values(categories).returning();
    console.log(`✅ Created ${insertedCategories.length} categories`);

    // Seed Articles
    console.log("\n📝 Creating articles...");
    const articles = [
      {
        categoryId: insertedCategories[0].id,
        authorId: adminUser.id,
        title: "The Founding of APC",
        slug: "founding-of-apc",
        content: `# The Founding of APC

The All Progressives Congress (APC) was formed in 2013 through a historic merger of Nigeria's major opposition parties. This landmark political alliance brought together:

- Action Congress of Nigeria (ACN)
- Congress for Progressive Change (CPC)
- All Nigeria Peoples Party (ANPP)
- A faction of the All Progressives Grand Alliance (APGA)

## The Vision

The merger was driven by a shared vision to provide Nigerians with a credible alternative to the then-ruling party. The founding members recognized that only through unity could they effectively challenge the status quo and bring about the change Nigeria desperately needed.

## Historical Significance

This merger marked the first time in Nigeria's democratic history that major opposition parties successfully united under one platform, demonstrating the power of collaboration in achieving political objectives.`,
        summary: "Learn about the historic merger that created the All Progressives Congress in 2013",
        published: true
      },
      {
        categoryId: insertedCategories[1].id,
        title: "APC's Policy Framework",
        slug: "apc-policy-framework",
        content: `# APC's Policy Framework

The All Progressives Congress operates on a comprehensive policy framework designed to address Nigeria's challenges and opportunities.

## Core Policy Pillars

### 1. Economic Development
- Diversification of the economy
- Support for SMEs and entrepreneurs
- Infrastructure development

### 2. Security
- Ensuring the safety of all Nigerians
- Modernizing security apparatus
- Community-based security initiatives

### 3. Education
- Improving access to quality education
- Skills development programs
- Education infrastructure upgrade

### 4. Healthcare
- Universal health coverage
- Primary healthcare strengthening
- Health insurance expansion

## Implementation Strategy

Our policies are implemented through collaborative efforts between federal, state, and local governments, ensuring that solutions are tailored to local needs while maintaining national coherence.`,
        summary: "An overview of APC's comprehensive policy framework and implementation strategy",
        authorId: adminUser.id,
        
        published: true,
        
      },
      {
        categoryId: insertedCategories[2].id,
        title: "How to Become an Active APC Member",
        slug: "become-active-member",
        content: `# How to Become an Active APC Member

Welcome to the APC family! Here's your guide to becoming an engaged and effective party member.

## Getting Started

### Step 1: Complete Your Registration
Ensure all your membership details are up to date, including:
- Personal information
- Contact details
- Ward/LGA affiliation

### Step 2: Verify Your Account
Complete NIN verification to unlock full member benefits and voting rights.

### Step 3: Explore the Platform
Familiarize yourself with APC Connect's features:
- News and updates
- Events calendar
- Discussion forums
- Volunteer opportunities

## Ways to Get Involved

### Attend Events
Participate in party meetings, rallies, and community events in your area.

### Join Discussions
Contribute your voice in party forums and idea campaigns.

### Volunteer
Sign up for volunteer tasks and help with party activities.

### Share Your Ideas
Submit policy suggestions through the ideas portal.

## Building Your Reputation

Earn points and badges by:
- Completing tasks
- Attending events
- Engaging in discussions
- Referring new members

## Next Steps

Connect with your ward and LGA leadership to learn about local opportunities and upcoming activities.`,
        summary: "A comprehensive guide for new members to get started and actively participate in APC",
        authorId: adminUser.id,
        
        published: true,
        
      },
      {
        categoryId: insertedCategories[3].id,
        title: "Understanding APC's Organizational Structure",
        slug: "organizational-structure",
        content: `# Understanding APC's Organizational Structure

The All Progressives Congress has a well-defined hierarchical structure that ensures effective organization and decision-making at all levels.

## National Level

### National Convention
The supreme authority of the party, comprising delegates from all states.

### National Executive Committee (NEC)
Implements decisions of the National Convention and oversees party operations.

### National Working Committee (NWC)
Manages day-to-day operations of the party at the national level.

## State Level

### State Congress
The highest decision-making body at the state level.

### State Executive Committee
Manages party affairs within the state.

### State Working Committee
Handles daily operations at the state level.

## Local Government Level

### LGA Congress
Makes decisions affecting the local government area.

### LGA Executive Committee
Coordinates party activities in the LGA.

## Ward Level

### Ward Congress
The foundational level where members directly participate in party governance.

### Ward Executive Committee
Manages activities at the grassroots level.

## Your Role

Every member plays a vital role in this structure, starting from the ward level. Active participation in ward meetings is your first step to influencing party decisions.`,
        summary: "An overview of APC's organizational hierarchy from national to ward level",
        authorId: adminUser.id,
        
        published: false,
        
      },
      {
        categoryId: insertedCategories[4].id,
        title: "Making the Most of APC Connect",
        slug: "maximizing-apc-connect",
        content: `# Making the Most of APC Connect

APC Connect is your digital gateway to party engagement. Here's how to maximize your experience.

## Key Features

### News & Updates
Stay informed about party activities, policies, and achievements through our news feed.

### Events Calendar
- View upcoming events in your area
- RSVP to events
- Earn points by attending

### Task System
Complete micro-tasks and volunteer opportunities to:
- Earn points and badges
- Build your reputation
- Contribute to party objectives

### Knowledge Base
Access articles, policy documents, and educational resources to:
- Understand party positions
- Learn about governance
- Stay politically informed

### Digital ID Card
Your verified digital membership card includes:
- QR code for event check-ins
- Membership details
- Security features

## Gamification & Rewards

### Points System
Earn points through:
- Event attendance
- Task completion
- Referrals
- Engagement activities

### Badges & Achievements
Unlock special badges by reaching milestones and completing challenges.

### Leaderboard
Track your progress and see top contributors in your ward, LGA, or state.

## Tips for Success

1. **Complete your profile** - Verify your NIN to access all features
2. **Check daily** - Don't miss important updates and opportunities
3. **Engage regularly** - Points and rankings are based on consistent participation
4. **Share the platform** - Use your referral code to invite others and earn rewards

## Getting Help

Access support through:
- FAQ section
- Chatbot assistant
- Contact support team
- Ward leadership`,
        summary: "Maximize your APC Connect experience with this comprehensive platform guide",
        authorId: adminUser.id,
        
        published: false,
        
      }
    ];

    const insertedArticles = await db.insert(schema.knowledgeArticles).values(articles).returning();
    console.log(`✅ Created ${insertedArticles.length} articles`);

    // Seed FAQs
    console.log("\n❓ Creating FAQs...");
    const faqs = [
      {
        category: "membership",
        question: "How do I verify my NIN?",
        answer: "Go to your profile page, click on 'Verify NIN', enter your 11-digit NIN number and date of birth, then click verify. Your NIN will be checked against NIMC records for authentication.",
        order: 1,
        featured: true
      },
      {
        category: "membership",
        question: "What are the benefits of NIN verification?",
        answer: "NIN verification activates your membership, enables voting rights, allows event check-ins, unlocks all platform features, and provides access to member-only content and opportunities.",
        order: 2,
        featured: true
      },
      {
        category: "points",
        question: "How do I earn points?",
        answer: "You can earn points by: attending events (50 points), completing micro-tasks (10-50 points), completing quizzes (20 points), referring new members (25 points), and engaging in campaigns. Check the rewards page for a complete list.",
        order: 3,
        featured: true
      },
      {
        category: "points",
        question: "What can I do with my points?",
        answer: "Points can be redeemed for: exclusive badges, priority event registration, promotional materials, and special recognition. More redemption options are being added regularly.",
        order: 4,
        featured: false
      },
      {
        category: "events",
        question: "How do I check in to an event?",
        answer: "Open your digital ID card from the profile menu, show your QR code to the event coordinator who will scan it. You can only check in if you're within 500 meters of the event location and within the check-in window (1 hour before to 2 hours after event start).",
        order: 5,
        featured: true
      },
      {
        category: "events",
        question: "Can I attend events in other wards or states?",
        answer: "Yes! While you're registered in a specific ward, you can attend events anywhere. However, your home ward events will be featured more prominently in your event feed.",
        order: 6,
        featured: false
      },
      {
        category: "tasks",
        question: "What are micro-tasks?",
        answer: "Micro-tasks are quick, simple activities that support party objectives, such as sharing content on social media, conducting surveys, distributing flyers, or making calls. They typically take 5-30 minutes and earn you points.",
        order: 7,
        featured: false
      },
      {
        category: "tasks",
        question: "How do I become a volunteer?",
        answer: "Visit the Volunteer section, browse available opportunities, and apply for tasks that match your skills and availability. Once approved, you'll receive task details and can start contributing.",
        order: 8,
        featured: false
      },
      {
        category: "account",
        question: "I forgot my password. How do I reset it?",
        answer: "Click 'Forgot Password' on the login page, enter your registered email address, and follow the instructions in the password reset email. If you don't receive the email within 5 minutes, check your spam folder.",
        order: 9,
        featured: false
      },
      {
        category: "account",
        question: "How do I update my contact information?",
        answer: "Go to Settings > Profile, update your information, and click Save. Note that some information like your registered ward requires admin approval to change.",
        order: 10,
        featured: false
      },
      {
        category: "security",
        question: "Is my personal information secure?",
        answer: "Yes. We use industry-standard encryption, secure data storage, regular security audits, and strict access controls. Your NIN and sensitive data are encrypted and only used for verification purposes.",
        order: 11,
        featured: true
      },
      {
        category: "security",
        question: "Can I use APC Connect on multiple devices?",
        answer: "Yes, you can log in from multiple devices. However, for security purposes, unusual login patterns may trigger verification requirements.",
        order: 12,
        featured: false
      }
    ];

    const insertedFaqs = await db.insert(schema.faqs).values(faqs).returning();
    console.log(`✅ Created ${insertedFaqs.length} FAQs`);

    const totalInserted = insertedCategories.length + insertedArticles.length + insertedFaqs.length;
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Knowledge Base Articles Seeding Completed Successfully!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Categories: ${insertedCategories.length}`);
    console.log(`   • Articles: ${insertedArticles.length}`);
    console.log(`   • FAQs: ${insertedFaqs.length}`);
    console.log(`   • Total Items: ${totalInserted}`);
    console.log("=".repeat(60) + "\n");

    return totalInserted;
  } catch (error) {
    console.error("\n❌ Knowledge Base Articles Seeding Failed!");
    console.error("Error details:", error);
    throw error;
  }
}

// Run if called directly
const isMainModule = process.argv[1]?.includes('seed-knowledge-articles.ts');

if (isMainModule) {
  seedKnowledgeArticles()
    .then((count) => {
      console.log(`\n✨ Seeding completed: ${count} items inserted`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Seeding failed:", error);
      process.exit(1);
    });
}
