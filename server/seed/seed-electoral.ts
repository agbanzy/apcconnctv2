import { db } from "../db";
import { senatorialDistricts, electoralStats, regionalElectoralStats, states } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface SenatorialDistrictData {
  state: string;
  district: string;
  code: string;
}

interface RegionalStats {
  voters: number;
  percentage: number;
}

interface INECStats {
  year: number;
  totalRegisteredVoters: number;
  maleVoters: number;
  femaleVoters: number;
  pwdVoters: number;
  registrationByRegion: Record<string, RegionalStats>;
}

interface ElectoralSystemData {
  electoralSystem: {
    senatorialDistricts: SenatorialDistrictData[];
    inecRegistrationStats: INECStats;
  };
}

export async function seedElectoral(): Promise<number> {
  console.log("🗳️  Starting Electoral System Data Seeding...");
  console.log("-".repeat(60));
  
  try {
    // Load electoral system JSON data
    const dataPath = path.join(process.cwd(), "attached_assets", "nigerian_electoral_system_1762978074392.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const data: ElectoralSystemData = JSON.parse(rawData);
    
    const { senatorialDistricts: senatorialDistrictsData, inecRegistrationStats } = data.electoralSystem;
    
    // Get all states to map state names to IDs
    const allStates = await db.select().from(states);
    const stateMap = new Map(
      allStates.map(state => [state.name, state.id])
    );
    
    // Also handle FCT (might be "Federal Capital Territory" in JSON)
    stateMap.set("Federal Capital Territory", stateMap.get("FCT") || stateMap.get("Federal Capital Territory")!);
    
    // Check if electoral data already exists
    const existingDistricts = await db.select({ count: sql<number>`count(*)` }).from(senatorialDistricts);
    const districtCount = Number(existingDistricts[0].count);
    
    if (districtCount > 0) {
      console.log(`\n⚠️  Electoral data already exists (${districtCount} senatorial districts found)`);
      console.log("⏭️  Skipping seeding to preserve existing data");
      
      const statsCount = await db.select({ count: sql<number>`count(*)` }).from(electoralStats);
      const regionalCount = await db.select({ count: sql<number>`count(*)` }).from(regionalElectoralStats);
      
      return districtCount + Number(statsCount[0].count) + Number(regionalCount[0].count);
    }
    
    // Step 1: Seed fresh electoral data (only if no existing data)
    console.log("\n📝 Seeding fresh electoral data...");
    
    // Step 2: Seed Senatorial Districts
    console.log("\n🏛️  Seeding Senatorial Districts...");
    const senatorialDistrictInserts = senatorialDistrictsData.map(district => {
      const stateId = stateMap.get(district.state);
      if (!stateId) {
        console.warn(`⚠️  Warning: State not found for district: ${district.state} - ${district.district}`);
        return null;
      }
      
      return {
        code: district.code,
        stateId: stateId,
        districtName: district.district,
      };
    }).filter(Boolean);
    
    if (senatorialDistrictInserts.length > 0) {
      await db.insert(senatorialDistricts).values(senatorialDistrictInserts as any[]);
      console.log(`✅ Inserted ${senatorialDistrictInserts.length} senatorial districts`);
    }
    
    // Step 3: Seed Electoral Statistics
    console.log("\n📊 Seeding Electoral Statistics...");
    const [statsRecord] = await db.insert(electoralStats).values({
      year: inecRegistrationStats.year,
      totalRegisteredVoters: inecRegistrationStats.totalRegisteredVoters,
      maleVoters: inecRegistrationStats.maleVoters,
      femaleVoters: inecRegistrationStats.femaleVoters,
      pwdVoters: inecRegistrationStats.pwdVoters,
    }).returning();
    
    console.log(`✅ Inserted electoral statistics for year ${inecRegistrationStats.year}`);
    console.log(`   Total Voters: ${inecRegistrationStats.totalRegisteredVoters.toLocaleString()}`);
    
    // Step 4: Seed Regional Electoral Statistics
    console.log("\n🌍 Seeding Regional Electoral Statistics...");
    const regionalStatsInserts = Object.entries(inecRegistrationStats.registrationByRegion).map(([region, stats]) => ({
      statsId: statsRecord.id,
      region: region,
      voters: stats.voters,
      percentage: stats.percentage.toString(),
    }));
    
    if (regionalStatsInserts.length > 0) {
      await db.insert(regionalElectoralStats).values(regionalStatsInserts);
      console.log(`✅ Inserted ${regionalStatsInserts.length} regional statistics`);
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📈 Electoral Data Seeding Summary:");
    console.log(`  • Senatorial Districts: ${senatorialDistrictInserts.length}`);
    console.log(`  • Electoral Year: ${inecRegistrationStats.year}`);
    console.log(`  • Total Registered Voters: ${inecRegistrationStats.totalRegisteredVoters.toLocaleString()}`);
    console.log(`  • Regional Breakdowns: ${regionalStatsInserts.length}`);
    console.log("=".repeat(60));
    
    return senatorialDistrictInserts.length + regionalStatsInserts.length + 1;
    
  } catch (error) {
    console.error("\n❌ Error seeding electoral data:", error);
    throw error;
  }
}
