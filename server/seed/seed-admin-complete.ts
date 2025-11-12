import { db } from "../db";
import { states, lgas, wards } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface Ward {
  wardId: string;
  name: string;
}

interface LGA {
  id: string;
  name: string;
  state: string;
  totalWards: number;
  wards?: Ward[];
}

interface StateData {
  id: string;
  name: string;
  region: string;
  capital: string;
  totalLGAs: number;
  lgas: LGA[];
}

interface AdminDivisionsData {
  nigeriaAdministrativeDivisions: {
    totalStates: number;
    totalFCT: number;
    totalLGAs: number;
    totalWards: number;
    states: StateData[];
  };
}

export async function seedAdminComplete(): Promise<{ states: number; lgas: number; wards: number }> {
  console.log("🗺️  Starting Complete Administrative Divisions Seeding...");
  console.log("-".repeat(60));
  
  try {
    // Load admin divisions JSON data
    const dataPath = path.join(process.cwd(), "attached_assets", "nigeria_admin_divisions_complete_1762978074393.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const data: AdminDivisionsData = JSON.parse(rawData);
    
    const { states: statesData } = data.nigeriaAdministrativeDivisions;
    
    console.log(`\n📊 Data Summary:`);
    console.log(`  • Total Administrative Units: ${data.nigeriaAdministrativeDivisions.totalStates + data.nigeriaAdministrativeDivisions.totalFCT} (36 states + 1 FCT)`);
    console.log(`  • Total LGAs: ${data.nigeriaAdministrativeDivisions.totalLGAs}`);
    console.log(`  • Total Wards: ${data.nigeriaAdministrativeDivisions.totalWards}`);
    
    // Check if data already exists
    const existingStates = await db.select({ count: sql<number>`count(*)` }).from(states);
    const stateCount = Number(existingStates[0].count);
    
    if (stateCount > 0) {
      console.log(`\n⚠️  Administrative data already exists (${stateCount} states found)`);
      console.log("⏭️  Skipping seeding to preserve existing data and foreign key relationships");
      
      // Get current counts for reporting
      const lgaCount = await db.select({ count: sql<number>`count(*)` }).from(lgas);
      const wardCount = await db.select({ count: sql<number>`count(*)` }).from(wards);
      
      return {
        states: stateCount,
        lgas: Number(lgaCount[0].count),
        wards: Number(wardCount[0].count),
      };
    }
    
    // Step 1: Seed fresh data (only if no existing data)
    console.log("\n📝 Seeding fresh administrative data...");
    
    // Step 2: Seed States
    console.log("\n🏛️  Seeding States...");
    const stateInserts = statesData.map(state => ({
      name: state.name,
      code: state.id,
      region: state.region,
      capital: state.capital,
    }));
    
    const insertedStates = await db.insert(states).values(stateInserts).returning();
    console.log(`✅ Inserted ${insertedStates.length} states/FCT`);
    
    // Create state ID mapping
    const stateMap = new Map(
      insertedStates.map(state => [state.code, state.id])
    );
    
    // Step 3: Seed LGAs
    console.log("\n🏙️  Seeding Local Government Areas (LGAs)...");
    let totalLGAs = 0;
    const lgaMap = new Map<string, string>(); // Map LGA code to ID
    
    for (const state of statesData) {
      const stateId = stateMap.get(state.id);
      if (!stateId) {
        console.warn(`⚠️  Warning: State ID not found for: ${state.name}`);
        continue;
      }
      
      const lgaInserts = state.lgas.map(lga => ({
        stateId: stateId,
        name: lga.name,
        code: lga.id,
      }));
      
      if (lgaInserts.length > 0) {
        const insertedLGAs = await db.insert(lgas).values(lgaInserts).returning();
        
        // Map LGA codes to IDs
        insertedLGAs.forEach(insertedLga => {
          const originalLga = state.lgas.find(l => l.id === insertedLga.code);
          if (originalLga) {
            lgaMap.set(originalLga.id, insertedLga.id);
          }
        });
        
        totalLGAs += insertedLGAs.length;
      }
    }
    
    console.log(`✅ Inserted ${totalLGAs} LGAs`);
    
    // Step 4: Seed Wards
    console.log("\n🏘️  Seeding Wards...");
    let totalWards = 0;
    
    for (const state of statesData) {
      for (const lga of state.lgas) {
        const lgaId = lgaMap.get(lga.id);
        if (!lgaId) {
          console.warn(`⚠️  Warning: LGA ID not found for: ${lga.name}`);
          continue;
        }
        
        // If wards are explicitly defined, use them
        if (lga.wards && lga.wards.length > 0) {
          const wardInserts = lga.wards.map((ward, index) => ({
            lgaId: lgaId,
            name: ward.name,
            code: ward.wardId,
            wardNumber: index + 1,
          }));
          
          await db.insert(wards).values(wardInserts);
          totalWards += wardInserts.length;
        } else if (lga.totalWards) {
          // If only totalWards is specified, generate generic ward names
          const wardInserts = Array.from({ length: lga.totalWards }, (_, index) => ({
            lgaId: lgaId,
            name: `${lga.name} Ward ${index + 1}`,
            code: `${lga.id}${String(index + 1).padStart(2, '0')}`,
            wardNumber: index + 1,
          }));
          
          await db.insert(wards).values(wardInserts);
          totalWards += wardInserts.length;
        }
      }
    }
    
    console.log(`✅ Inserted ${totalWards} wards`);
    
    // Verification
    console.log("\n🔍 Verifying Data Integrity...");
    const finalStateCount = await db.select({ count: sql<number>`count(*)` }).from(states);
    const finalLgaCount = await db.select({ count: sql<number>`count(*)` }).from(lgas);
    const finalWardCount = await db.select({ count: sql<number>`count(*)` }).from(wards);
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 Administrative Divisions Seeding Summary:");
    console.log(`  • States/FCT: ${finalStateCount[0].count} (Expected: 37)`);
    console.log(`  • LGAs: ${finalLgaCount[0].count} (Expected: 774)`);
    console.log(`  • Wards: ${finalWardCount[0].count} (Expected: 9410+)`);
    
    // Validation
    const expectedStates = 37;
    const expectedLGAs = 774;
    
    if (Number(finalStateCount[0].count) !== expectedStates) {
      console.warn(`⚠️  Warning: Expected ${expectedStates} states/FCT, but got ${finalStateCount[0].count}`);
    } else {
      console.log(`✅ States/FCT count verified!`);
    }
    
    if (Number(finalLgaCount[0].count) !== expectedLGAs) {
      console.warn(`⚠️  Warning: Expected ${expectedLGAs} LGAs, but got ${finalLgaCount[0].count}`);
    } else {
      console.log(`✅ LGA count verified!`);
    }
    
    console.log("=".repeat(60));
    
    return {
      states: Number(finalStateCount[0].count),
      lgas: Number(finalLgaCount[0].count),
      wards: Number(finalWardCount[0].count),
    };
    
  } catch (error) {
    console.error("\n❌ Error seeding administrative divisions:", error);
    throw error;
  }
}
