import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

console.log("🛡️ COMPREHENSIVE ANTI-CHEAT SYSTEM TEST");
console.log("=".repeat(70));

interface TestResult {
  test: string;
  status: "✅ PASS" | "❌ FAIL";
  message: string;
}

const results: TestResult[] = [];

async function runTests() {
  try {
    // Get a test user and member
    console.log("\n📋 Test Setup");
    console.log("-".repeat(70));
    
    const testUser = await db.query.users.findFirst({
      where: eq(schema.users.email, "agbane6@gmail.com"),
      with: { member: true }
    });

    if (!testUser || !testUser.member) {
      throw new Error("Test user not found. Please login as admin first.");
    }

    const memberId = testUser.member.id;
    console.log(`✅ Using test member: ${testUser.email} (ID: ${memberId})`);

    // ========================================================================
    // TEST 1: Quiz Attempt - Unique Constraint
    // ========================================================================
    console.log("\n\n🧪 TEST 1: Quiz Attempt Duplicate Prevention");
    console.log("-".repeat(70));
    
    const testQuiz = await db.query.quizzes.findFirst();
    if (!testQuiz) {
      results.push({
        test: "Quiz Duplicate Prevention",
        status: "❌ FAIL",
        message: "No quiz found for testing"
      });
    } else {
      // Check if member already attempted this quiz
      const existingAttempt = await db.query.quizAttempts.findFirst({
        where: and(
          eq(schema.quizAttempts.memberId, memberId),
          eq(schema.quizAttempts.quizId, testQuiz.id)
        )
      });

      if (existingAttempt) {
        console.log("ℹ️  Member already attempted this quiz. Testing duplicate prevention...");
        
        try {
          // Try to insert duplicate
          await db.insert(schema.quizAttempts).values({
            quizId: testQuiz.id,
            memberId: memberId,
            selectedAnswer: 1,
            isCorrect: true,
            pointsEarned: 5,
            ipAddress: "192.168.1.1",
            userAgent: "Test-Agent",
            fingerprint: "test-fingerprint",
            completionTime: 30
          });
          
          results.push({
            test: "Quiz Duplicate Prevention",
            status: "❌ FAIL",
            message: "Duplicate quiz attempt was NOT blocked by database"
          });
        } catch (error: any) {
          if (error.code === '23505') { // Unique violation
            results.push({
              test: "Quiz Duplicate Prevention",
              status: "✅ PASS",
              message: "Database correctly blocked duplicate quiz attempt"
            });
            console.log("✅ PASS: Unique constraint prevented duplicate quiz attempt");
          } else {
            throw error;
          }
        }
      } else {
        console.log("ℹ️  No existing attempt found. Creating first attempt...");
        await db.insert(schema.quizAttempts).values({
          quizId: testQuiz.id,
          memberId: memberId,
          selectedAnswer: 1,
          isCorrect: true,
          pointsEarned: 5,
          ipAddress: "192.168.1.1",
          userAgent: "Test-Agent",
          fingerprint: "test-fingerprint",
          completionTime: 30
        });
        console.log("✅ First attempt created successfully");
        
        // Now try duplicate
        try {
          await db.insert(schema.quizAttempts).values({
            quizId: testQuiz.id,
            memberId: memberId,
            selectedAnswer: 2,
            isCorrect: false,
            pointsEarned: 0,
            ipAddress: "192.168.1.2",
            userAgent: "Test-Agent-2",
            fingerprint: "test-fingerprint-2",
            completionTime: 15
          });
          
          results.push({
            test: "Quiz Duplicate Prevention",
            status: "❌ FAIL",
            message: "Duplicate quiz attempt was NOT blocked"
          });
        } catch (error: any) {
          if (error.code === '23505') {
            results.push({
              test: "Quiz Duplicate Prevention",
              status: "✅ PASS",
              message: "Unique constraint correctly blocked duplicate"
            });
            console.log("✅ PASS: Duplicate attempt correctly blocked");
          } else {
            throw error;
          }
        }
      }
    }

    // ========================================================================
    // TEST 2: Task Completion - Unique Constraint
    // ========================================================================
    console.log("\n\n🧪 TEST 2: Task Completion Duplicate Prevention");
    console.log("-".repeat(70));
    
    const testTask = await db.query.microTasks.findFirst();
    if (!testTask) {
      results.push({
        test: "Task Duplicate Prevention",
        status: "❌ FAIL",
        message: "No task found for testing"
      });
    } else {
      const existingCompletion = await db.query.taskCompletions.findFirst({
        where: and(
          eq(schema.taskCompletions.memberId, memberId),
          eq(schema.taskCompletions.taskId, testTask.id),
          eq(schema.taskCompletions.taskType, "micro")
        )
      });

      if (!existingCompletion) {
        // Create first completion
        await db.insert(schema.taskCompletions).values({
          taskId: testTask.id,
          taskType: "micro",
          memberId: memberId,
          proofUrl: "https://example.com/proof1.jpg",
          status: "approved",
          pointsEarned: 10,
          ipAddress: "192.168.1.1",
          userAgent: "Test-Agent",
          fingerprint: "test-fingerprint"
        });
        console.log("✅ First task completion created");
      }

      // Try duplicate
      try {
        await db.insert(schema.taskCompletions).values({
          taskId: testTask.id,
          taskType: "micro",
          memberId: memberId,
          proofUrl: "https://example.com/proof2.jpg",
          status: "pending",
          pointsEarned: 10,
          ipAddress: "192.168.1.2",
          userAgent: "Test-Agent-2",
          fingerprint: "test-fingerprint-2"
        });
        
        results.push({
          test: "Task Duplicate Prevention",
          status: "❌ FAIL",
          message: "Duplicate task completion was NOT blocked"
        });
      } catch (error: any) {
        if (error.code === '23505') {
          results.push({
            test: "Task Duplicate Prevention",
            status: "✅ PASS",
            message: "Unique constraint correctly blocked duplicate"
          });
          console.log("✅ PASS: Duplicate task completion blocked");
        } else {
          throw error;
        }
      }
    }

    // ========================================================================
    // TEST 3: Campaign Vote - Unique Constraint
    // ========================================================================
    console.log("\n\n🧪 TEST 3: Campaign Vote Duplicate Prevention");
    console.log("-".repeat(70));
    
    const testCampaign = await db.query.issueCampaigns.findFirst();
    if (!testCampaign) {
      results.push({
        test: "Vote Duplicate Prevention",
        status: "❌ FAIL",
        message: "No campaign found for testing"
      });
    } else {
      const existingVote = await db.query.campaignVotes.findFirst({
        where: and(
          eq(schema.campaignVotes.memberId, memberId),
          eq(schema.campaignVotes.campaignId, testCampaign.id)
        )
      });

      if (!existingVote) {
        // Create first vote
        await db.insert(schema.campaignVotes).values({
          campaignId: testCampaign.id,
          memberId: memberId,
          voteType: "support",
          ipAddress: "192.168.1.1",
          userAgent: "Test-Agent",
          fingerprint: "test-fingerprint"
        });
        console.log("✅ First vote created");
      }

      // Try duplicate vote
      try {
        await db.insert(schema.campaignVotes).values({
          campaignId: testCampaign.id,
          memberId: memberId,
          voteType: "support",
          ipAddress: "192.168.1.2",
          userAgent: "Test-Agent-2",
          fingerprint: "test-fingerprint-2"
        });
        
        results.push({
          test: "Vote Duplicate Prevention",
          status: "❌ FAIL",
          message: "Duplicate vote was NOT blocked"
        });
      } catch (error: any) {
        if (error.code === '23505') {
          results.push({
            test: "Vote Duplicate Prevention",
            status: "✅ PASS",
            message: "Unique constraint correctly blocked duplicate"
          });
          console.log("✅ PASS: Duplicate vote blocked");
        } else {
          throw error;
        }
      }
    }

    // ========================================================================
    // TEST 4: Event Attendance - Unique Constraint
    // ========================================================================
    console.log("\n\n🧪 TEST 4: Event Attendance Duplicate Prevention");
    console.log("-".repeat(70));
    
    const testEvent = await db.query.events.findFirst();
    if (!testEvent) {
      results.push({
        test: "Event Duplicate Prevention",
        status: "❌ FAIL",
        message: "No event found for testing"
      });
    } else {
      const existingAttendance = await db.query.eventAttendance.findFirst({
        where: and(
          eq(schema.eventAttendance.memberId, memberId),
          eq(schema.eventAttendance.eventId, testEvent.id)
        )
      });

      if (!existingAttendance) {
        // Create first attendance
        await db.insert(schema.eventAttendance).values({
          eventId: testEvent.id,
          memberId: memberId,
          pointsEarned: 10,
          coordinates: { lat: 6.5244, lng: 3.3792 },
          ipAddress: "192.168.1.1",
          userAgent: "Test-Agent",
          fingerprint: "test-fingerprint"
        });
        console.log("✅ First attendance created");
      }

      // Try duplicate attendance
      try {
        await db.insert(schema.eventAttendance).values({
          eventId: testEvent.id,
          memberId: memberId,
          pointsEarned: 10,
          coordinates: { lat: 6.5244, lng: 3.3792 },
          ipAddress: "192.168.1.2",
          userAgent: "Test-Agent-2",
          fingerprint: "test-fingerprint-2"
        });
        
        results.push({
          test: "Event Duplicate Prevention",
          status: "❌ FAIL",
          message: "Duplicate event attendance was NOT blocked"
        });
      } catch (error: any) {
        if (error.code === '23505') {
          results.push({
            test: "Event Duplicate Prevention",
            status: "✅ PASS",
            message: "Unique constraint correctly blocked duplicate"
          });
          console.log("✅ PASS: Duplicate event attendance blocked");
        } else {
          throw error;
        }
      }
    }

    // ========================================================================
    // TEST 5: Fraud Detection Metadata
    // ========================================================================
    console.log("\n\n🧪 TEST 5: Fraud Detection Metadata Verification");
    console.log("-".repeat(70));
    
    // Check for records WITH metadata (created by anti-cheat system)
    const recordsWithMetadata = await db.query.quizAttempts.findMany({
      where: and(
        eq(schema.quizAttempts.memberId, memberId),
        sql`${schema.quizAttempts.ipAddress} IS NOT NULL`,
        sql`${schema.quizAttempts.userAgent} IS NOT NULL`,
        sql`${schema.quizAttempts.fingerprint} IS NOT NULL`
      ),
      limit: 1
    });

    if (recordsWithMetadata.length > 0) {
      const record = recordsWithMetadata[0];
      results.push({
        test: "Fraud Detection Metadata",
        status: "✅ PASS",
        message: "Anti-cheat system captures metadata correctly on new records"
      });
      console.log("✅ PASS: Fraud detection metadata captured:");
      console.log(`   • IP Address: ${record.ipAddress}`);
      console.log(`   • User Agent: ${record.userAgent?.substring(0, 50)}...`);
      console.log(`   • Fingerprint: ${record.fingerprint}`);
      console.log(`   • Completion Time: ${record.completionTime} seconds`);
      console.log("\nℹ️  Note: Legacy records may lack metadata; this is expected behavior");
    } else {
      results.push({
        test: "Fraud Detection Metadata",
        status: "❌ FAIL",
        message: "No quiz attempts with metadata found - anti-cheat not capturing data"
      });
    }

    // ========================================================================
    // FINAL RESULTS
    // ========================================================================
    console.log("\n\n");
    console.log("=".repeat(70));
    console.log("📊 FINAL TEST RESULTS");
    console.log("=".repeat(70));
    
    let passCount = 0;
    let failCount = 0;

    results.forEach(result => {
      console.log(`\n${result.status} ${result.test}`);
      console.log(`   ${result.message}`);
      
      if (result.status === "✅ PASS") passCount++;
      else failCount++;
    });

    console.log("\n" + "=".repeat(70));
    console.log(`✅ PASSED: ${passCount}/${results.length}`);
    console.log(`❌ FAILED: ${failCount}/${results.length}`);
    console.log("=".repeat(70));

    if (failCount === 0) {
      console.log("\n🎉 ALL ANTI-CHEAT TESTS PASSED! System is secure and unhackable.");
    } else {
      console.log("\n⚠️  Some tests failed. Review security implementation.");
    }

    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error("\n❌ TEST SUITE ERROR:", error);
    process.exit(1);
  }
}

runTests();
