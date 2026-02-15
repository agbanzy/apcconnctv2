import { db } from "../db";
import { wards, pollingUnits } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  console.log("=== Cleaning orphaned records ===\n");

  // Fix orphaned wards
  console.log("Fixing orphaned wards...");
  const orphanWards = await db.execute(sql`SELECT id FROM wards WHERE lga_id NOT IN (SELECT id FROM lgas)`);
  for (const r of orphanWards.rows) {
    const wId = (r as any).id;
    await db.execute(sql`DELETE FROM polling_units WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE events SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE news_posts SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE micro_tasks SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE volunteer_tasks SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.execute(sql`UPDATE issue_campaigns SET ward_id = NULL WHERE ward_id = ${wId}`);
    await db.delete(wards).where(eq(wards.id, wId));
  }
  console.log(`  Fixed ${orphanWards.rows.length} orphaned wards`);

  // Fix invalid member refs
  console.log("\nFixing invalid member ward refs...");
  await db.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)`);

  // Clean PU references first
  console.log("\nCleaning orphaned PU references...");
  
  // Create a temp table of orphan PU ids for efficiency
  await db.execute(sql`CREATE TEMP TABLE orphan_pu_ids AS SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards)`);
  
  const orphanCount = (await db.execute(sql`SELECT COUNT(*)::int as cnt FROM orphan_pu_ids`)).rows[0] as any;
  console.log(`  ${orphanCount.cnt} orphaned PUs to clean`);

  // Clean references using the temp table
  console.log("  Cleaning polling_unit_results...");
  await db.execute(sql`DELETE FROM polling_unit_results WHERE polling_unit_id IN (SELECT id FROM orphan_pu_ids)`);
  
  console.log("  Cleaning incidents...");
  await db.execute(sql`DELETE FROM incidents WHERE polling_unit_id IN (SELECT id FROM orphan_pu_ids)`);
  
  console.log("  Cleaning polling_agents...");
  await db.execute(sql`DELETE FROM polling_agents WHERE polling_unit_id IN (SELECT id FROM orphan_pu_ids)`);
  
  console.log("  Cleaning result_sheets...");
  await db.execute(sql`DELETE FROM result_sheets WHERE polling_unit_id IN (SELECT id FROM orphan_pu_ids)`);

  // Delete orphaned PUs using temp table
  console.log("  Deleting orphaned polling units...");
  await db.execute(sql`DELETE FROM polling_units WHERE id IN (SELECT id FROM orphan_pu_ids)`);
  
  // Drop temp table
  await db.execute(sql`DROP TABLE IF EXISTS orphan_pu_ids`);
  
  console.log("  Done!");

  // Final validation
  console.log("\n--- Final validation ---");
  const fc = (await db.execute(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM states) AS states,
      (SELECT COUNT(*)::int FROM lgas) AS lgas,
      (SELECT COUNT(*)::int FROM wards) AS wards,
      (SELECT COUNT(*)::int FROM polling_units) AS pus,
      (SELECT COUNT(*)::int FROM wards WHERE lga_id NOT IN (SELECT id FROM lgas)) AS orphan_wards,
      (SELECT COUNT(*)::int FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards)) AS orphan_pus,
      (SELECT COUNT(*)::int FROM members WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)) AS invalid_members
  `)).rows[0] as any;

  console.log(`States: ${fc.states}`);
  console.log(`LGAs: ${fc.lgas} (expected 774)`);
  console.log(`Wards: ${fc.wards}`);
  console.log(`Polling Units: ${fc.pus}`);
  console.log(`Orphan wards: ${fc.orphan_wards}`);
  console.log(`Orphan PUs: ${fc.orphan_pus}`);
  console.log(`Invalid member refs: ${fc.invalid_members}`);

  // Ward distribution
  const wardDist = await db.execute(sql`
    SELECT s.name, COUNT(w.id)::int as ward_count, COUNT(DISTINCT l.id)::int as lga_count
    FROM states s 
    JOIN lgas l ON l.state_id = s.id 
    LEFT JOIN wards w ON w.lga_id = l.id
    GROUP BY s.name ORDER BY s.name
  `);
  console.log("\nPer-state ward counts:");
  for (const r of wardDist.rows) {
    const row = r as any;
    console.log(`  ${row.name}: ${row.lga_count} LGAs, ${row.ward_count} wards`);
  }

  // PU distribution
  const puDist = await db.execute(sql`
    SELECT s.name, COUNT(pu.id)::int as pu_count
    FROM states s 
    JOIN lgas l ON l.state_id = s.id 
    JOIN wards w ON w.lga_id = l.id
    LEFT JOIN polling_units pu ON pu.ward_id = w.id
    GROUP BY s.name ORDER BY s.name
  `);
  console.log("\nPer-state polling unit counts:");
  for (const r of puDist.rows) {
    const row = r as any;
    console.log(`  ${row.name}: ${row.pu_count} PUs`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
