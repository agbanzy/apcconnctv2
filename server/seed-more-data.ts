import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function seedMoreData() {
  console.log("🌱 Seeding additional demo data...");

  try {
    // Get existing members for relationships
    const members = await db.query.members.findMany({
      limit: 20,
      with: { user: true }
    });

    const elections = await db.query.elections.findMany();
    const events = await db.query.events.findMany({ limit: 10 });
    const newsPosts = await db.query.newsPosts.findMany({ limit: 10 });
    const microTasks = await db.query.microTasks.findMany({ limit: 10 });
    const volunteerTasks = await db.query.volunteerTasks.findMany({ limit: 8 });
    const quizzes = await db.query.quizzes.findMany();
    const campaigns = await db.query.issueCampaigns.findMany();

    if (members.length === 0) {
      console.log("❌ No members found. Please seed users first.");
      return;
    }

    console.log(`Found ${members.length} members to work with`);

    // 1. Add more IDEAS (currently only 1)
    console.log("Adding more ideas...");
    const ideaTitles = [
      "Youth Employment Program",
      "Digital Government Services",
      "Renewable Energy Initiative",
      "Healthcare Accessibility",
      "Education Reform Package",
      "Infrastructure Development",
      "Agricultural Modernization",
      "Small Business Support",
      "Technology Hubs",
      "Sports Development"
    ];

    for (let i = 0; i < 10; i++) {
      const randomMember = members[Math.floor(Math.random() * members.length)];
      await db.insert(schema.ideas).values({
        title: ideaTitles[i],
        description: `A comprehensive proposal for ${ideaTitles[i].toLowerCase()} that addresses key challenges and provides practical solutions for implementation across Nigeria.`,
        category: ["governance", "infrastructure", "economy", "education", "health"][i % 5],
        memberId: randomMember.id,
        status: ["pending", "under_review", "approved"][Math.floor(Math.random() * 3)] as any,
        votesCount: Math.floor(Math.random() * 100)
      }).onConflictDoNothing();
    }

    // 2. Add ELECTION VOTES and more CANDIDATES
    console.log("Adding election candidates and votes...");
    for (const election of elections) {
      // Check if election has candidates
      const existingCandidates = await db.query.candidates.findMany({
        where: eq(schema.candidates.electionId, election.id)
      });

      // Add more candidates if needed
      if (existingCandidates.length < 3) {
        const candidateNames = ["Amina Bello", "Chidi Okafor", "Fatima Yusuf", "Emeka Nwankwo"];
        for (let i = existingCandidates.length; i < 4; i++) {
          await db.insert(schema.candidates).values({
            electionId: election.id,
            name: candidateNames[i] || `Candidate ${i + 1}`,
            manifesto: `Dedicated to serving with integrity and bringing positive change to our community.`,
            experience: `${5 + i} years of active party service and community leadership.`,
            votes: 0
          });
        }
      }

      // Get all candidates for this election
      const candidates = await db.query.candidates.findMany({
        where: eq(schema.candidates.electionId, election.id)
      });

      // Add votes from members
      for (let i = 0; i < Math.min(10, members.length); i++) {
        const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
        try {
          await db.insert(schema.votes).values({
            electionId: election.id,
            candidateId: randomCandidate.id,
            voterId: members[i].id,
            blockchainHash: `0x${Math.random().toString(16).substring(2, 66)}`
          }).onConflictDoNothing();

          // Update candidate vote count
          await db.update(schema.candidates)
            .set({ votes: sql`${schema.candidates.votes} + 1` })
            .where(eq(schema.candidates.id, randomCandidate.id));
        } catch (e) {
          // Skip if already voted
        }
      }
    }

    // 3. Add EVENT RSVPs
    console.log("Adding event RSVPs...");
    for (const event of events) {
      for (let i = 0; i < Math.min(5, members.length); i++) {
        try {
          await db.insert(schema.eventRsvps).values({
            eventId: event.id,
            memberId: members[i].id,
            status: Math.random() > 0.2 ? "confirmed" : "cancelled"
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already RSVPed
        }
      }
    }

    // 4. Add NEWS COMMENTS and LIKES
    console.log("Adding news comments and likes...");
    for (const newsPost of newsPosts) {
      // Add likes via postEngagement
      for (let i = 0; i < Math.min(8, members.length); i++) {
        try {
          await db.insert(schema.postEngagement).values({
            postId: newsPost.id,
            memberId: members[i].id,
            type: "like"
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already liked
        }
      }

      // Add comments
      const comments = [
        "This is great news for our party! Looking forward to positive changes.",
        "Excellent initiative. How can we get involved?",
        "This aligns perfectly with our vision for Nigeria.",
        "Thank you for keeping us informed!",
        "Looking forward to seeing the results of this program."
      ];

      for (let i = 0; i < Math.min(3, members.length); i++) {
        const comment = await db.insert(schema.newsComments).values({
          newsPostId: newsPost.id,
          memberId: members[i].id,
          content: comments[i % comments.length]
        }).returning();

        // Add replies to some comments
        if (i === 0 && members.length > 1) {
          await db.insert(schema.newsComments).values({
            newsPostId: newsPost.id,
            memberId: members[1].id,
            parentId: comment[0].id,
            content: "I completely agree! This is a step in the right direction."
          }).onConflictDoNothing();
        }
      }
    }

    // 5. Add TASK COMPLETIONS
    console.log("Adding task completions...");
    for (const task of microTasks.slice(0, 8)) {
      for (let i = 0; i < Math.min(3, members.length); i++) {
        try {
          await db.insert(schema.microTaskCompletions).values({
            taskId: task.id,
            memberId: members[i].id,
            status: ["completed", "pending", "verified"][Math.floor(Math.random() * 3)] as any,
            completedAt: new Date()
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already completed
        }
      }
    }

    // Add volunteer task applications
    for (const task of volunteerTasks) {
      for (let i = 0; i < Math.min(2, members.length); i++) {
        try {
          await db.insert(schema.taskApplications).values({
            taskId: task.id,
            memberId: members[i].id,
            status: ["pending", "accepted", "completed"][Math.floor(Math.random() * 3)] as any
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already applied
        }
      }
    }

    // 6. Add QUIZ ATTEMPTS
    console.log("Adding quiz attempts...");
    for (const quiz of quizzes) {
      for (let i = 0; i < Math.min(5, members.length); i++) {
        const isCorrect = Math.random() > 0.4;
        try {
          await db.insert(schema.quizAttempts).values({
            quizId: quiz.id,
            memberId: members[i].id,
            selectedAnswer: isCorrect ? quiz.correctAnswer : (quiz.correctAnswer + 1) % 4,
            isCorrect,
            pointsEarned: isCorrect ? quiz.points : 0
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already attempted
        }
      }
    }

    // 7. Add CAMPAIGN VOTES
    console.log("Adding campaign votes...");
    for (const campaign of campaigns) {
      for (let i = 0; i < Math.min(7, members.length); i++) {
        try {
          await db.insert(schema.campaignVotes).values({
            campaignId: campaign.id,
            memberId: members[i].id
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already voted
        }
      }
    }

    // 8. Add IDEA VOTES
    console.log("Adding idea votes...");
    const ideas = await db.query.ideas.findMany();
    for (const idea of ideas) {
      for (let i = 0; i < Math.min(5, members.length); i++) {
        try {
          await db.insert(schema.ideaVotes).values({
            ideaId: idea.id,
            memberId: members[i].id,
            voteType: Math.random() > 0.3 ? "upvote" : "downvote"
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already voted
        }
      }
    }

    // 9. Add GAMIFICATION DATA
    console.log("Adding gamification data...");
    const badges = await db.query.badges.findMany();
    
    // Award badges to members
    for (let i = 0; i < Math.min(10, members.length); i++) {
      const randomBadges = badges
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 4) + 1);
      
      for (const badge of randomBadges) {
        try {
          await db.insert(schema.userBadges).values({
            memberId: members[i].id,
            badgeId: badge.id
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if already awarded
        }
      }
    }

    // Add point transactions for members
    const pointSources = ["quiz", "task", "campaign", "events", "engagement", "referral"];
    for (let i = 0; i < Math.min(15, members.length); i++) {
      // Add multiple point entries for varied sources
      for (let j = 0; j < Math.floor(Math.random() * 5) + 2; j++) {
        try {
          await db.insert(schema.userPoints).values({
            memberId: members[i].id,
            points: 0, // This field seems unused, amount is what counts
            source: pointSources[Math.floor(Math.random() * pointSources.length)],
            amount: Math.floor(Math.random() * 500) + 50
          }).onConflictDoNothing();
        } catch (e) {
          // Skip if error
        }
      }
    }

    // 10. Add DONATIONS
    console.log("Adding donations...");
    const donationCategories = ["general", "campaign", "infrastructure", "youth_programs", "community_development"];
    for (let i = 0; i < Math.min(10, members.length); i++) {
      try {
        await db.insert(schema.donations).values({
          memberId: members[i].id,
          amount: (Math.floor(Math.random() * 20) + 1) * 1000,
          category: donationCategories[Math.floor(Math.random() * donationCategories.length)] as any,
          paymentMethod: "paystack",
          paystackReference: `TXN_${Math.random().toString(36).substring(7).toUpperCase()}`,
          paymentStatus: "completed",
          isAnonymous: Math.random() > 0.7,
          paidAt: new Date()
        }).onConflictDoNothing();
      } catch (e) {
        console.log("Skip donation:", e);
      }
    }

    // 11. Add MEMBERSHIP DUES
    console.log("Adding membership dues...");
    for (let i = 0; i < Math.min(8, members.length); i++) {
      try {
        await db.insert(schema.membershipDues).values({
          memberId: members[i].id,
          amount: "5000",
          paymentMethod: "paystack",
          paystackReference: `DUE_${Math.random().toString(36).substring(7).toUpperCase()}`,
          paymentStatus: Math.random() > 0.3 ? "completed" : "pending",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paidAt: Math.random() > 0.3 ? new Date() : null
        }).onConflictDoNothing();
      } catch (e) {
        console.log("Skip dues:", e);
      }
    }

    // 12. Add REFERRALS
    console.log("Adding referrals...");
    
    // First, update some members with referral codes
    for (let i = 0; i < Math.min(10, members.length); i++) {
      const code = `APC${members[i].user.firstName.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await db.update(schema.members)
        .set({ referralCode: code })
        .where(eq(schema.members.id, members[i].id));
    }

    // Create referral relationships
    if (members.length >= 5) {
      // Member 0 referred members 1, 2, 3
      for (let i = 1; i <= 3; i++) {
        try {
          await db.update(schema.members)
            .set({ referredBy: members[0].id })
            .where(eq(schema.members.id, members[i].id));

          await db.insert(schema.referrals).values({
            referrerId: members[0].id,
            referredId: members[i].id,
            status: "completed",
            pointsEarned: 100
          }).onConflictDoNothing();
        } catch (e) {
          console.log("Skip referral:", e);
        }
      }

      // Member 1 referred member 4
      if (members.length > 4) {
        try {
          await db.update(schema.members)
            .set({ referredBy: members[1].id })
            .where(eq(schema.members.id, members[4].id));

          await db.insert(schema.referrals).values({
            referrerId: members[1].id,
            referredId: members[4].id,
            status: "completed",
            pointsEarned: 100
          }).onConflictDoNothing();
        } catch (e) {
          console.log("Skip referral:", e);
        }
      }
    }

    console.log("✅ Additional demo data seeded successfully!");
    console.log("\nSummary:");
    console.log("- Added 10 new ideas");
    console.log("- Added election candidates and votes");
    console.log("- Added event RSVPs");
    console.log("- Added news comments and likes");
    console.log("- Added task completions");
    console.log("- Added quiz attempts");
    console.log("- Added campaign votes");
    console.log("- Added idea votes");
    console.log("- Added member badges and points");
    console.log("- Added donations");
    console.log("- Added membership dues");
    console.log("- Added referral relationships");

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMoreData()
    .then(() => {
      console.log("Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedMoreData };
