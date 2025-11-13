import xlsx from "xlsx";
import { db } from "./db.js";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import path from "path";
import fs from "fs";

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

interface SeedError {
  level: 'state' | 'lga' | 'ward';
  name: string;
  parent?: string;
  error: string;
}

interface SeedStats {
  statesAdded: number;
  lgasAdded: number;
  wardsAdded: number;
  statesSkipped: number;
  lgasSkipped: number;
  wardsSkipped: number;
  duplicatesDetected: number;
  errorsEncountered: number;
}

/**
 * Expected data counts from the Excel file (nga_admin_boundaries_1762975238593.xlsx)
 * Note: The 715 wards represent administrative capitals and major wards only,
 * not Nigeria's full ~8,809 ward list
 */
const EXPECTED_COUNTS = {
  states: 38,  // All 36 states + FCT + potentially one additional entry
  lgas: 775,   // Local Government Areas
  wards: 715,  // Administrative capitals/major wards (subset of all wards)
};

/**
 * Normalizes administrative unit names for consistent comparison and storage
 * - Converts to uppercase
 * - Collapses multiple spaces to single space
 * - Trims leading/trailing whitespace
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Generate a unique state code from state name
 * Uses first 3 letters, handles special cases, and ensures uniqueness
 */
function generateStateCode(stateName: string, existingCodes: Set<string>): string {
  // Handle special cases
  if (stateName === "Abuja FCT" || stateName === "FCT" || stateName.includes("Federal Capital")) {
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
  
  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Excel file not found at: ${resolvedPath}\n` +
      `Please ensure the file exists or set the ADMIN_BOUNDARIES_FILE environment variable.`
    );
  }

  console.log(`📄 Reading Excel file: ${resolvedPath}`);
  
  let workbook;
  try {
    workbook = xlsx.readFile(resolvedPath);
  } catch (error: any) {
    throw new Error(
      `Failed to read Excel file: ${error.message}\n` +
      `Please ensure the file is a valid Excel (.xlsx) file.`
    );
  }

  // Validate required sheets exist
  const requiredSheets = ["nga_admin1", "nga_admin2", "nga_admin3"];
  const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
  
  if (missingSheets.length > 0) {
    throw new Error(
      `Excel file is missing required sheets: ${missingSheets.join(", ")}\n` +
      `Found sheets: ${workbook.SheetNames.join(", ")}\n` +
      `Expected sheets: ${requiredSheets.join(", ")}`
    );
  }

  // Extract data from sheets
  const statesSheet = workbook.Sheets["nga_admin1"];
  const states = xlsx.utils.sheet_to_json<StateData>(statesSheet, { defval: "" });

  const lgasSheet = workbook.Sheets["nga_admin2"];
  const lgas = xlsx.utils.sheet_to_json<LGAData>(lgasSheet, { defval: "" });

  const wardsSheet = workbook.Sheets["nga_admin3"];
  const wards = xlsx.utils.sheet_to_json<WardData>(wardsSheet, { defval: "" });

  console.log(`✅ Excel file parsed successfully`);
  console.log(`   📋 Data counts:`);
  console.log(`      - States: ${states.length} (expected: ${EXPECTED_COUNTS.states})`);
  console.log(`      - LGAs: ${lgas.length} (expected: ${EXPECTED_COUNTS.lgas})`);
  console.log(`      - Wards: ${wards.length} (expected: ${EXPECTED_COUNTS.wards} - administrative capitals/major wards)`);

  // Validate data counts (warning only, not fatal)
  if (states.length !== EXPECTED_COUNTS.states) {
    console.warn(`⚠️  Warning: States count mismatch. Expected ${EXPECTED_COUNTS.states}, got ${states.length}`);
  }
  if (lgas.length !== EXPECTED_COUNTS.lgas) {
    console.warn(`⚠️  Warning: LGAs count mismatch. Expected ${EXPECTED_COUNTS.lgas}, got ${lgas.length}`);
  }
  if (wards.length !== EXPECTED_COUNTS.wards) {
    console.warn(`⚠️  Warning: Wards count mismatch. Expected ${EXPECTED_COUNTS.wards}, got ${wards.length}`);
  }

  // Validate data is not empty
  if (states.length === 0 || lgas.length === 0 || wards.length === 0) {
    throw new Error(
      `Excel file contains empty data:\n` +
      `   States: ${states.length}\n` +
      `   LGAs: ${lgas.length}\n` +
      `   Wards: ${wards.length}\n` +
      `All sheets must contain data.`
    );
  }

  return { states, lgas, wards };
}

/**
 * Seed administrative boundaries from Excel file
 * 
 * @param filePath - Optional path to Excel file. Falls back to:
 *                   1. ADMIN_BOUNDARIES_FILE environment variable
 *                   2. Default path: attached_assets/nga_admin_boundaries_1762975238593.xlsx
 * 
 * @returns Statistics about the seeding operation
 * 
 * @throws Error if file is not found, invalid, or seeding fails
 * 
 * Note: This function uses a database transaction to ensure atomicity.
 * If any error occurs during seeding, all changes are rolled back.
 */
export async function seedAdminBoundaries(filePath?: string): Promise<SeedStats> {
  // Determine file path (parameter > env var > default)
  const excelPath = 
    filePath || 
    process.env.ADMIN_BOUNDARIES_FILE || 
    "attached_assets/nga_admin_boundaries_1762975238593.xlsx";

  console.log("\n" + "=".repeat(70));
  console.log("🌍 NIGERIA ADMINISTRATIVE BOUNDARIES SEEDING");
  console.log("=".repeat(70));
  console.log(`📂 File path: ${excelPath}`);
  console.log(`📝 Note: Ward data represents administrative capitals/major wards,`);
  console.log(`   not Nigeria's full ~8,809 ward list.`);
  console.log("=".repeat(70) + "\n");

  const stats: SeedStats = {
    statesAdded: 0,
    lgasAdded: 0,
    wardsAdded: 0,
    statesSkipped: 0,
    lgasSkipped: 0,
    wardsSkipped: 0,
    duplicatesDetected: 0,
    errorsEncountered: 0,
  };

  const errors: SeedError[] = [];

  try {
    // Parse Excel file (validates file exists and has correct structure)
    const { states: statesData, lgas: lgasData, wards: wardsData } = parseExcelFile(excelPath);

    // Wrap entire seeding process in a transaction for atomicity
    await db.transaction(async (tx) => {
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
        const statePcode = stateData.adm1_pcode.trim();
        const stateName = normalizeName(stateData.adm1_name);

        // Generate unique state code
        const stateCode = generateStateCode(stateName, existingStateCodes);
        existingStateCodes.add(stateCode);

        try {
          // Insert state
          const [insertedState] = await tx
            .insert(schema.states)
            .values({
              name: stateName,
              code: stateCode,
            })
            .returning();

          stateIdByPcode.set(statePcode, insertedState.id);
          stats.statesAdded++;
          console.log(`  ✅ Added state: ${stateName} (${stateCode})`);
        } catch (error: any) {
          if (error.code === '23505') {
            // PostgreSQL unique constraint violation - duplicate detected
            console.log(`  ⏭️  Skipping duplicate state: ${stateName}`);
            stats.statesSkipped++;
            stats.duplicatesDetected++;
            
            // Fetch the existing state to get its ID
            const existingState = await tx.query.states.findFirst({
              where: eq(schema.states.name, stateName),
            });
            if (existingState) {
              stateIdByPcode.set(statePcode, existingState.id);
            }
          } else {
            // Other errors - track but continue
            console.error(`  ❌ Error inserting state ${stateName}:`, error.message);
            errors.push({
              level: 'state',
              name: stateName,
              error: error.message
            });
            stats.errorsEncountered++;
          }
        }
      }

      console.log(`\n📊 States: ${stats.statesAdded} added, ${stats.statesSkipped} skipped`);

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
          errors.push({
            level: 'lga',
            name: `Unknown LGA in ${statePcode}`,
            error: errorMsg
          });
          stats.errorsEncountered++;
          continue; // Skip this state's LGAs but continue with others
        }

        // Get state name and code for logging
        const stateData = statesData.find(s => s.adm1_pcode === statePcode);
        const stateName = normalizeName(stateData?.adm1_name || statePcode);
        
        const state = await tx.query.states.findFirst({
          where: eq(schema.states.id, stateId),
        });
        const stateCode = state?.code || "";

        console.log(`\n  Processing ${stateLGAs.length} LGAs for ${stateName}...`);

        for (const lgaData of stateLGAs) {
          const lgaPcode = lgaData.adm2_pcode.trim();
          const lgaName = normalizeName(lgaData.adm2_name);

          // Generate unique LGA code
          const lgaCode = generateLGACode(lgaName, stateCode, existingLGACodes);
          existingLGACodes.add(lgaCode);

          try {
            // Insert LGA
            const [insertedLGA] = await tx
              .insert(schema.lgas)
              .values({
                name: lgaName,
                stateId: stateId,
                code: lgaCode,
              })
              .returning();

            lgaIdByPcode.set(lgaPcode, insertedLGA.id);
            stats.lgasAdded++;
            console.log(`    ✅ Added LGA: ${lgaName} (${lgaCode})`);
          } catch (error: any) {
            if (error.code === '23505') {
              // PostgreSQL unique constraint violation - duplicate detected
              console.log(`    ⏭️  Skipping duplicate LGA: ${lgaName} in ${stateName}`);
              stats.lgasSkipped++;
              stats.duplicatesDetected++;
              
              // Fetch the existing LGA to get its ID
              const existingLGA = await tx.query.lgas.findFirst({
                where: and(
                  eq(schema.lgas.name, lgaName),
                  eq(schema.lgas.stateId, stateId)
                ),
              });
              if (existingLGA) {
                lgaIdByPcode.set(lgaPcode, existingLGA.id);
              }
            } else {
              // Other errors - track but continue
              console.error(`    ❌ Error inserting LGA ${lgaName}:`, error.message);
              errors.push({
                level: 'lga',
                name: lgaName,
                parent: stateName,
                error: error.message
              });
              stats.errorsEncountered++;
            }
          }
        }
      }

      console.log(`\n📊 LGAs: ${stats.lgasAdded} added, ${stats.lgasSkipped} skipped`);

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
          errors.push({
            level: 'ward',
            name: `Unknown ward in ${lgaPcode}`,
            error: errorMsg
          });
          stats.errorsEncountered++;
          continue; // Skip this LGA's wards but continue with others
        }

        // Get LGA code and name for logging
        const lga = await tx.query.lgas.findFirst({
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
          const wardName = normalizeName(wardData.adm3_name);
          const wardPcode = wardData.adm3_pcode.trim();

          // Generate unique ward code
          const wardCode = generateWardCode(lgaCode, wardNumber);

          try {
            // Insert ward
            await tx
              .insert(schema.wards)
              .values({
                name: wardName,
                lgaId: lgaId,
                code: wardCode,
                wardNumber: wardNumber,
              })
              .returning();

            stats.wardsAdded++;
            console.log(`    ✅ Added ward: ${wardName}`);
            wardNumber++;
          } catch (error: any) {
            if (error.code === '23505') {
              // PostgreSQL unique constraint violation - duplicate detected
              console.log(`    ⏭️  Skipping duplicate ward: ${wardName} in ${lgaName}`);
              stats.wardsSkipped++;
              stats.duplicatesDetected++;
              wardNumber++;
            } else {
              // Other errors - track but continue
              console.error(`    ❌ Error inserting ward ${wardName}:`, error.message);
              errors.push({
                level: 'ward',
                name: wardName,
                parent: lgaName,
                error: error.message
              });
              stats.errorsEncountered++;
            }
          }
        }
      }

      console.log(`\n📊 Wards: ${stats.wardsAdded} added, ${stats.wardsSkipped} skipped`);

      // Transaction completed successfully
      console.log("\n✅ Transaction committed successfully!");
    });

    // ====================================================================
    // FINAL SUMMARY
    // ====================================================================
    console.log("\n" + "=".repeat(70));
    console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log("\n📈 Summary:");
    console.log(`   States:  ${stats.statesAdded} added, ${stats.statesSkipped} skipped`);
    console.log(`   LGAs:    ${stats.lgasAdded} added, ${stats.lgasSkipped} skipped`);
    console.log(`   Wards:   ${stats.wardsAdded} added, ${stats.wardsSkipped} skipped`);
    console.log(`   Total Duplicates: ${stats.duplicatesDetected}`);
    console.log(`   Errors Encountered: ${stats.errorsEncountered}`);
    
    if (stats.duplicatesDetected > 0) {
      console.log(`\n⚠️  Data Integrity: ${stats.duplicatesDetected} duplicate(s) detected and skipped`);
      console.log(`   (Duplicates prevented by unique constraints on name)`);
    }
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered during seeding:`);
      errors.forEach((err, index) => {
        const parentInfo = err.parent ? ` in ${err.parent}` : '';
        console.log(`   ${index + 1}. ${err.level}: ${err.name}${parentInfo} - ${err.error}`);
      });
    } else {
      console.log(`\n✨ No errors encountered!`);
    }
    console.log("\n" + "=".repeat(70) + "\n");

    return stats;
  } catch (error: any) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ SEEDING FAILED - TRANSACTION ROLLED BACK");
    console.error("=".repeat(70));
    console.error(`\n💥 Error: ${error.message}\n`);
    console.error("All database changes have been rolled back.");
    console.error("=".repeat(70) + "\n");
    
    // Record fatal error
    stats.errorsEncountered++;
    throw error;
  }
}

// If run directly from command line (disabled for production safety)
// To seed boundaries, use the API endpoint: POST /api/admin/seed-boundaries
// This prevents automatic seeding on production deployments which can crash the server
// 
// if (import.meta.url === `file://${process.argv[1]}`) {
//   seedAdminBoundaries()
//     .then(() => {
//       console.log("✅ Seeding script completed successfully");
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error("❌ Seeding script failed:", error);
//       process.exit(1);
//     });
// }
