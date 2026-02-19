import { db } from "./db";
import { pollingUnits, wards, lgas, states } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import * as fs from "fs";

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { fields.push(field.trim()); field = ""; }
    else { field += ch; }
  }
  fields.push(field.trim());
  return fields;
}

function normalize(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function seedPollingUnits(options?: { clearExisting?: boolean }): Promise<{
  totalRecords: number;
  matched: number;
  skipped: number;
  newLgas: number;
  newWards: number;
  totalPollingUnits: number;
}> {
  console.log("Loading existing administrative data...");
  const allStates = await db.select().from(states);
  const allLgas = await db.select().from(lgas);
  const allWards = await db.select().from(wards);
  console.log(`Found: ${allStates.length} states, ${allLgas.length} LGAs, ${allWards.length} wards`);

  const stateMap = new Map<string, string>();
  for (const s of allStates) stateMap.set(normalize(s.name), s.id);
  const fctId = stateMap.get(normalize("ABUJA FCT")) || stateMap.get(normalize("FEDERAL CAPITAL TERRITORY"));
  if (fctId) {
    stateMap.set(normalize("FEDERAL CAPITAL TERRITORY"), fctId);
    stateMap.set(normalize("ABUJA FCT"), fctId);
    stateMap.set("FEDERALCAPITALTERRITORY", fctId);
  }

  const lgaByState = new Map<string, Map<string, string>>();
  for (const l of allLgas) {
    if (!lgaByState.has(l.stateId)) lgaByState.set(l.stateId, new Map());
    lgaByState.get(l.stateId)!.set(normalize(l.name), l.id);
  }

  const wardByLga = new Map<string, Map<string, string>>();
  for (const w of allWards) {
    if (!wardByLga.has(w.lgaId)) wardByLga.set(w.lgaId, new Map());
    wardByLga.get(w.lgaId)!.set(normalize(w.name), w.id);
  }

  console.log("Parsing INEC CSV...");
  const csvContent = fs.readFileSync("./attached_assets/polling-units.csv", "utf8");
  const lines = csvContent.split("\n").slice(1).filter((l) => l.trim());
  console.log(`Total records: ${lines.length}`);

  console.log("Phase 1: Pre-creating missing LGAs and wards...");
  const lgasToCreate: { id: string; name: string; code: string; stateId: string }[] = [];
  const wardsToCreate: { id: string; name: string; code: string; lgaId: string }[] = [];
  let lgaCounter = 0;
  let wardCounter = 0;

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    const wardName = fields[1];
    const lgaName = fields[2];
    const stateName = fields[3];

    const stateId = stateMap.get(normalize(stateName));
    if (!stateId) continue;

    if (!lgaByState.has(stateId)) lgaByState.set(stateId, new Map());
    const stateLgas = lgaByState.get(stateId)!;
    let lgaId = stateLgas.get(normalize(lgaName));

    if (!lgaId) {
      lgaId = crypto.randomUUID();
      lgaCounter++;
      const lgaCode = `LGA-NEW-${lgaCounter}`;
      stateLgas.set(normalize(lgaName), lgaId);
      lgasToCreate.push({ id: lgaId, name: lgaName, code: lgaCode, stateId });
    }

    if (!wardByLga.has(lgaId)) wardByLga.set(lgaId, new Map());
    const lgaWards = wardByLga.get(lgaId)!;
    if (!lgaWards.has(normalize(wardName))) {
      const wardId = crypto.randomUUID();
      wardCounter++;
      const wardCode = `WRD-NEW-${wardCounter}`;
      lgaWards.set(normalize(wardName), wardId);
      wardsToCreate.push({ id: wardId, name: wardName, code: wardCode, lgaId });
    }
  }

  console.log(`Need to create ${lgasToCreate.length} new LGAs, ${wardsToCreate.length} new wards`);

  const LGA_BATCH = 200;
  for (let i = 0; i < lgasToCreate.length; i += LGA_BATCH) {
    const chunk = lgasToCreate.slice(i, i + LGA_BATCH);
    await db.insert(lgas).values(chunk).onConflictDoNothing();
    if ((i / LGA_BATCH) % 5 === 0) console.log(`  LGAs: ${Math.min(i + LGA_BATCH, lgasToCreate.length)}/${lgasToCreate.length}`);
  }

  const WARD_BATCH = 500;
  for (let i = 0; i < wardsToCreate.length; i += WARD_BATCH) {
    const chunk = wardsToCreate.slice(i, i + WARD_BATCH);
    await db.insert(wards).values(chunk).onConflictDoNothing();
    if ((i / WARD_BATCH) % 10 === 0) console.log(`  Wards: ${Math.min(i + WARD_BATCH, wardsToCreate.length)}/${wardsToCreate.length}`);
  }

  if (options?.clearExisting) {
    console.log("Phase 2: Clearing existing polling units...");
    await db.delete(pollingUnits);
  } else {
    console.log("Phase 2: Skipping clear (additive mode)...");
  }

  console.log("Phase 3: Inserting polling units...");
  let matched = 0;
  let skipped = 0;
  const PU_BATCH = 1000;
  let batch: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 4) { skipped++; continue; }

    const puName = fields[0];
    const wardName = fields[1];
    const lgaName = fields[2];
    const stateName = fields[3];
    const lat = fields[4] ? parseFloat(fields[4]) : null;
    const lng = fields[5] ? parseFloat(fields[5]) : null;

    const validLat = lat !== null && !isNaN(lat) && lat >= 3 && lat <= 15;
    const validLng = lng !== null && !isNaN(lng) && lng >= 2 && lng <= 15;

    const stateId = stateMap.get(normalize(stateName));
    if (!stateId) { skipped++; continue; }

    const lgaId = lgaByState.get(stateId)?.get(normalize(lgaName));
    if (!lgaId) { skipped++; continue; }

    const wardId = wardByLga.get(lgaId)?.get(normalize(wardName));
    if (!wardId) { skipped++; continue; }

    batch.push({
      name: puName,
      unitCode: `PU-${String(i + 1).padStart(6, "0")}`,
      wardId,
      latitude: validLat ? lat : null,
      longitude: validLng ? lng : null,
    });
    matched++;

    if (batch.length >= PU_BATCH) {
      await db.insert(pollingUnits).values(batch).onConflictDoNothing();
      batch = [];
      if (matched % 25000 === 0) {
        console.log(`  Progress: ${matched}/${lines.length} (${Math.round((matched / lines.length) * 100)}%)`);
      }
    }
  }

  if (batch.length > 0) {
    await db.insert(pollingUnits).values(batch).onConflictDoNothing();
  }

  const count = await db.select({ count: sql<number>`count(*)` }).from(pollingUnits);
  const totalPollingUnits = Number(count[0].count);

  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`Total records: ${lines.length}`);
  console.log(`Matched & inserted: ${matched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`New LGAs created: ${lgasToCreate.length}`);
  console.log(`New wards created: ${wardsToCreate.length}`);
  console.log(`Total polling units in DB: ${totalPollingUnits}`);

  return {
    totalRecords: lines.length,
    matched,
    skipped,
    newLgas: lgasToCreate.length,
    newWards: wardsToCreate.length,
    totalPollingUnits,
  };
}

const isDirectRun = process.argv[1]?.includes("seed-polling-units");
if (isDirectRun) {
  seedPollingUnits({ clearExisting: true }).then(() => process.exit(0)).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
