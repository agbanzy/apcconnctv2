import xlsx from "xlsx";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import path from "path";

interface StateData {
  adm1_name: string;
  adm1_pcode: string;
}

interface LGAData {
  adm2_name: string;
  adm2_pcode: string;
  adm1_pcode: string;
}

interface WardData {
  adm3_name: string;
  adm3_pcode: string;
  adm2_pcode: string;
}

interface SeedStats {
  statesInserted: number;
  lgasInserted: number;
  wardsInserted: number;
  statesSkipped: number;
  lgasSkipped: number;
  wardsSkipped: number;
  errors: string[];
}

/**
 * Generate a unique state code from state name
 * Uses first 3 letters, handles special cases, and ensures uniqueness
 */
function generateStateCode(stateName: string, existingCodes: Set<string>): string {
  // Handle special cases
  if (stateName === "Abuja FCT" || stateName === "FCT") {
    return "FCT";
  }

  // Clean the name: remove common suffixes, dashes, spaces
  let cleanName = stateName
    .replace(/\s+State$/i, "")
    .replace(/\s+FCT$/i, "")
    .replace(/[-\s]/g, "")
    .toUpperCase();

  // Get first 3 letters
  let code = cleanName.substring(0, 3);

  // If code already exists, try to find a unique variant
  if (existingCodes.has(code)) {
    // Try first 4 letters if available
    if (cleanName.length >= 4) {
      code = cleanName.substring(0, 4);
    }
    
    // If still exists, append numbers
    let counter = 1;
    let originalCode = code;
    while (existingCodes.has(code)) {
      code = originalCode + counter;
      counter++;
    }
  }

  return code;
}

/**
 * Generate a unique LGA code from LGA name and state code
 */
function generateLGACode(lgaName: string, stateCode: string, existingCodes: Set<string>): string {
  // Clean the name: remove common suffixes
  let cleanName = lgaName
    .replace(/\s+LGA$/i, "")
    .replace(/\s+Local\s+Government$/i, "")
    .replace(/\s+Area$/i, "")
    .replace(/[-\s]/g, "")
    .toUpperCase();

  // Get first 3 letters of LGA name
  let lgaShort = cleanName.substring(0, 3);
  let code = `${stateCode}-${lgaShort}`;

  // If code already exists, use more letters or append numbers
  if (existingCodes.has(code)) {
    if (cleanName.length >= 4) {
      lgaShort = cleanName.substring(0, 4);
      code = `${stateCode}-${lgaShort}`;
    }

    let counter = 1;
    let originalCode = code;
    while (existingCodes.has(code)) {
      code = `${originalCode}${counter}`;
      counter++;
    }
  }

  return code;
}

/**
 * Generate a unique ward code from LGA code and ward number
 */
function generateWardCode(lgaCode: string, wardNumber: number): string {
  return `${lgaCode}-W${String(wardNumber).padStart(3, "0")}`;
}

/**
 * Parse Excel file and extract administrative boundaries data
 */
function parseExcelFile(filePath: string): {
  states: StateData[];
  lgas: LGAData[];
  wards: WardData[];
} {
  // Resolve the file path relative to the project root
  const resolvedPath = path.resolve(process.cwd(), filePath);
  console.log(`📄 Reading Excel file: ${resolvedPath}`);
  const workbook = xlsx.readFile(resolvedPath);

  // Extract states from nga_admin1 sheet
  const statesSheet = workbook.Sheets["nga_admin1"];
  const states = xlsx.utils.sheet_to_json<StateData>(statesSheet, { defval: "" });

  // Extract LGAs from nga_admin2 sheet
  const lgasSheet = workbook.Sheets["nga_admin2"];
  const lgas = xlsx.utils.sheet_to_json<LGAData>(lgasSheet, { defval: "" });

  // Extract wards from nga_admin3 sheet
  const wardsSheet = workbook.Sheets["nga_admin3"];
  const wards = xlsx.utils.sheet_to_json<WardData>(wardsSheet, { defval: "" });

  console.log(`✅ Parsed: ${states.length} states, ${lgas.length} LGAs, ${wards.length} wards`);

  return { states, lgas, wards };
}

/**
 * Seed administrative boundaries from Excel file
 */
export async function seedAdminBoundaries(): Promise<SeedStats> {
  const stats: SeedStats = {
    statesInserted: 0,
    lgasInserted: 0,
    wardsInserted: 0,
    statesSkipped: 0,
    lgasSkipped: 0,
    wardsSkipped: 0,
    errors: [],
  };

  try {
    console.log("\n🌍 Starting Nigeria Administrative Boundaries Seeding...\n");

    // Parse Excel file
    const filePath = "attached_assets/nga_admin_boundaries_1762975238593.xlsx";
    const { states: statesData, lgas: lgasData, wards: wardsData } = parseExcelFile(filePath);

    // Maps to track database IDs and codes
    const stateIdByPcode = new Map<string, string>();
    const lgaIdByPcode = new Map<string, string>();
    const existingStateCodes = new Set<string>();
    const existingLGACodes = new Set<string>();

    // ====================================================================
    // STEP 1: Seed States
    // ====================================================================
    console.log("\n📍 Step 1: Seeding States...");

    for (const stateData of statesData) {
      try {
        const stateName = stateData.adm1_name.trim();
        const statePcode = stateData.adm1_pcode.trim();

        // Check if state already exists by name
        const existingState = await db.query.states.findFirst({
          where: eq(schema.states.name, stateName),
        });

        if (existingState) {
          console.log(`  ⏭️  State "${stateName}" already exists, skipping...`);
          stats.statesSkipped++;
          stateIdByPcode.set(statePcode, existingState.id);
          existingStateCodes.add(existingState.code);
          continue;
        }

        // Generate unique state code
        const stateCode = generateStateCode(stateName, existingStateCodes);
        existingStateCodes.add(stateCode);

        // Insert state
        const [insertedState] = await db
          .insert(schema.states)
          .values({
            name: stateName,
            code: stateCode,
          })
          .returning();

        stateIdByPcode.set(statePcode, insertedState.id);
        stats.statesInserted++;
        console.log(`  ✅ Inserted state: ${stateName} (${stateCode})`);
      } catch (error: any) {
        const errorMsg = `Error inserting state "${stateData.adm1_name}": ${error.message}`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    console.log(`\n📊 States: ${stats.statesInserted} inserted, ${stats.statesSkipped} skipped`);

    // ====================================================================
    // STEP 2: Seed LGAs
    // ====================================================================
    console.log("\n📍 Step 2: Seeding LGAs...");

    // Group LGAs by state for better logging
    const lgasByState = new Map<string, LGAData[]>();
    for (const lgaData of lgasData) {
      const statePcode = lgaData.adm1_pcode;
      if (!lgasByState.has(statePcode)) {
        lgasByState.set(statePcode, []);
      }
      lgasByState.get(statePcode)!.push(lgaData);
    }

    for (const [statePcode, stateLGAs] of Array.from(lgasByState.entries())) {
      const stateId = stateIdByPcode.get(statePcode);
      
      if (!stateId) {
        const errorMsg = `State with pcode "${statePcode}" not found in database`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        continue;
      }

      // Get state name for logging
      const stateData = statesData.find(s => s.adm1_pcode === statePcode);
      const stateName = stateData?.adm1_name || statePcode;
      
      // Get state code
      const state = await db.query.states.findFirst({
        where: eq(schema.states.id, stateId),
      });
      const stateCode = state?.code || "";

      console.log(`\n  Processing ${stateLGAs.length} LGAs for ${stateName}...`);

      for (const lgaData of stateLGAs) {
        try {
          const lgaName = lgaData.adm2_name.trim();
          const lgaPcode = lgaData.adm2_pcode.trim();

          // Check if LGA already exists by name and state
          const existingLGA = await db.query.lgas.findFirst({
            where: and(
              eq(schema.lgas.name, lgaName),
              eq(schema.lgas.stateId, stateId)
            ),
          });

          if (existingLGA) {
            stats.lgasSkipped++;
            lgaIdByPcode.set(lgaPcode, existingLGA.id);
            existingLGACodes.add(existingLGA.code);
            continue;
          }

          // Generate unique LGA code
          const lgaCode = generateLGACode(lgaName, stateCode, existingLGACodes);
          existingLGACodes.add(lgaCode);

          // Insert LGA
          const [insertedLGA] = await db
            .insert(schema.lgas)
            .values({
              name: lgaName,
              stateId: stateId,
              code: lgaCode,
            })
            .returning();

          lgaIdByPcode.set(lgaPcode, insertedLGA.id);
          stats.lgasInserted++;
          console.log(`    ✅ ${lgaName} (${lgaCode})`);
        } catch (error: any) {
          const errorMsg = `Error inserting LGA "${lgaData.adm2_name}": ${error.message}`;
          console.error(`    ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log(`\n📊 LGAs: ${stats.lgasInserted} inserted, ${stats.lgasSkipped} skipped`);

    // ====================================================================
    // STEP 3: Seed Wards
    // ====================================================================
    console.log("\n📍 Step 3: Seeding Wards...");

    // Group wards by LGA for better logging and ward numbering
    const wardsByLGA = new Map<string, WardData[]>();
    for (const wardData of wardsData) {
      const lgaPcode = wardData.adm2_pcode;
      if (!wardsByLGA.has(lgaPcode)) {
        wardsByLGA.set(lgaPcode, []);
      }
      wardsByLGA.get(lgaPcode)!.push(wardData);
    }

    let totalLGAsProcessed = 0;
    for (const [lgaPcode, lgaWards] of Array.from(wardsByLGA.entries())) {
      const lgaId = lgaIdByPcode.get(lgaPcode);
      
      if (!lgaId) {
        const errorMsg = `LGA with pcode "${lgaPcode}" not found in database`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        continue;
      }

      // Get LGA code for ward code generation
      const lga = await db.query.lgas.findFirst({
        where: eq(schema.lgas.id, lgaId),
      });
      const lgaCode = lga?.code || "";
      const lgaName = lga?.name || lgaPcode;

      totalLGAsProcessed++;
      if (totalLGAsProcessed % 50 === 0) {
        console.log(`  Processing wards... (${totalLGAsProcessed}/${wardsByLGA.size} LGAs)`);
      }

      let wardNumber = 1;
      for (const wardData of lgaWards) {
        try {
          const wardName = wardData.adm3_name.trim();
          const wardPcode = wardData.adm3_pcode.trim();

          // Check if ward already exists by name and LGA
          const existingWard = await db.query.wards.findFirst({
            where: and(
              eq(schema.wards.name, wardName),
              eq(schema.wards.lgaId, lgaId)
            ),
          });

          if (existingWard) {
            stats.wardsSkipped++;
            wardNumber++;
            continue;
          }

          // Generate unique ward code
          const wardCode = generateWardCode(lgaCode, wardNumber);

          // Insert ward
          await db
            .insert(schema.wards)
            .values({
              name: wardName,
              lgaId: lgaId,
              code: wardCode,
              wardNumber: wardNumber,
            })
            .returning();

          stats.wardsInserted++;
          wardNumber++;
        } catch (error: any) {
          const errorMsg = `Error inserting ward "${wardData.adm3_name}" in LGA "${lgaName}": ${error.message}`;
          console.error(`    ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log(`\n📊 Wards: ${stats.wardsInserted} inserted, ${stats.wardsSkipped} skipped`);

    // ====================================================================
    // FINAL SUMMARY
    // ====================================================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SEEDING COMPLETED!");
    console.log("=".repeat(60));
    console.log("\n📈 Summary:");
    console.log(`   States:  ${stats.statesInserted} inserted, ${stats.statesSkipped} skipped`);
    console.log(`   LGAs:    ${stats.lgasInserted} inserted, ${stats.lgasSkipped} skipped`);
    console.log(`   Wards:   ${stats.wardsInserted} inserted, ${stats.wardsSkipped} skipped`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log(`\n✨ No errors encountered!`);
    }
    console.log("\n" + "=".repeat(60) + "\n");

    return stats;
  } catch (error: any) {
    console.error("\n❌ Fatal error during seeding:", error);
    stats.errors.push(`Fatal error: ${error.message}`);
    throw error;
  }
}

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminBoundaries()
    .then(() => {
      console.log("✅ Seeding script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding script failed:", error);
      process.exit(1);
    });
}
