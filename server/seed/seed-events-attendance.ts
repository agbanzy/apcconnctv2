import { db } from "../db";
import * as schema from "../../shared/schema";
import { sql } from "drizzle-orm";

export async function seedEventsAttendance() {
  console.log("🎫 Seeding Event Attendance (RSVPs)...");
  
  // Get all events
  const allEvents = await db.select().from(schema.events);
  console.log(`  Found ${allEvents.length} events in database`);
  
  if (allEvents.length === 0) {
    console.log("⚠️ No events found. Please seed events first.");
    return { rsvps: 0 };
  }
  
  // Get members for RSVPs
  const allMembers = await db.select().from(schema.members).limit(500);
  console.log(`  Found ${allMembers.length} members for event RSVPs`);
  
  if (allMembers.length === 0) {
    throw new Error("No members found! Please seed users first.");
  }
  
  // Create RSVPs for each event
  console.log("  Creating event RSVPs...");
  const rsvpsToCreate: schema.InsertEventRsvp[] = [];
  
  for (const event of allEvents) {
    // Determine how many RSVPs this event should have
    const maxAttendees = event.maxAttendees || 100;
    const attendeeCount = Math.floor(Math.random() * maxAttendees * 0.8) + Math.floor(maxAttendees * 0.1);
    // Between 10% and 90% capacity
    
    // Randomly select members for this event
    const shuffledMembers = [...allMembers].sort(() => Math.random() - 0.5);
    const attendees = shuffledMembers.slice(0, Math.min(attendeeCount, allMembers.length));
    
    for (const member of attendees) {
      const status = Math.random() < 0.92 ? "confirmed" : "cancelled"; // 92% confirmed
      
      rsvpsToCreate.push({
        eventId: event.id,
        memberId: member.id,
        status,
      } as schema.InsertEventRsvp);
    }
  }
  
  console.log(`  Preparing to insert ${rsvpsToCreate.length} RSVPs...`);
  
  // Insert RSVPs in batches to avoid overwhelming the database
  const batchSize = 100;
  let insertedRsvps = 0;
  
  for (let i = 0; i < rsvpsToCreate.length; i += batchSize) {
    const batch = rsvpsToCreate.slice(i, i + batchSize);
    
    // Use INSERT ... ON CONFLICT DO NOTHING to handle duplicates
    try {
      await db.insert(schema.eventRsvps).values(batch as any);
      insertedRsvps += batch.length;
      console.log(`  Inserted ${insertedRsvps}/${rsvpsToCreate.length} RSVPs`);
    } catch (error: any) {
      // If there's a conflict (duplicate), skip this batch
      if (error.code === '23505') {
        console.log(`  Skipping batch ${i} due to duplicates`);
        continue;
      }
      throw error;
    }
  }
  
  console.log(`✅ Successfully seeded ${insertedRsvps} event RSVPs!`);
  
  return { rsvps: insertedRsvps };
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('seed-events-attendance');

if (isMainModule) {
  seedEventsAttendance()
    .then((counts) => {
      console.log(`\n🎉 Event attendance seeding completed!`);
      console.log(`  RSVPs Created: ${counts.rsvps}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Event attendance seeding failed:", error);
      process.exit(1);
    });
}
