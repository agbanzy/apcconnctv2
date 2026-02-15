import { db } from "../db";
import { lgas, wards } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function mergeLga(sourceId: string, targetId: string) {
  const srcWards = await db.select().from(wards).where(eq(wards.lgaId, sourceId));
  const tgtWards = await db.select().from(wards).where(eq(wards.lgaId, targetId));
  const tgtNames = new Map(tgtWards.map(w => [w.name.toLowerCase().replace(/[\s\-\/]+/g, ''), w.id]));

  for (const sw of srcWards) {
    const key = sw.name.toLowerCase().replace(/[\s\-\/]+/g, '');
    const existing = tgtNames.get(key);
    if (existing) {
      await db.execute(sql`UPDATE polling_units SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE members SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      for (const t of ['events','news_posts','micro_tasks','volunteer_tasks','issue_campaigns']) {
        await db.execute(sql.raw(`UPDATE ${t} SET ward_id = '${existing}' WHERE ward_id = '${sw.id}'`));
      }
      await db.delete(wards).where(eq(wards.id, sw.id));
    } else {
      await db.update(wards).set({ lgaId: targetId }).where(eq(wards.id, sw.id));
    }
  }

  for (const t of ['events','news_posts','issue_campaigns','micro_tasks','volunteer_tasks']) {
    await db.execute(sql.raw(`UPDATE ${t} SET lga_id = '${targetId}' WHERE lga_id = '${sourceId}'`));
  }

  await db.delete(lgas).where(eq(lgas.id, sourceId));
}

async function run() {
  console.log("=== Final LGA fixes ===\n");

  // BAYELSA: 10 -> 8
  // Extras: "Ekeremor North" (merge into Ekeremor), "Nembe II III" (merge into Nembe), 
  // "Southern Ijaw II" (merge into Southern Ijaw)
  // Missing: Kolokuma/Opokuma
  console.log("Bayelsa: Merging duplicates...");
  // Merge Ekeremor North -> Ekeremor
  await mergeLga('f304ad1e-993d-4072-88e6-207739211fa2', '738ae087-f9fe-4a97-b255-f61a943b8f2c');
  console.log("  Merged Ekeremor North -> Ekeremor");
  // Merge Nembe II III -> Nembe
  await mergeLga('a15f2aaf-25e8-4de4-99ef-e43ee7184233', '7199e3db-942e-457b-b489-74a20fba8853');
  console.log("  Merged Nembe II III -> Nembe");
  // Merge Southern Ijaw II -> Southern Ijaw
  await mergeLga('4600c2b9-8bf6-471a-820d-7b1d0936c308', 'eab00180-23be-4eba-9531-ccfcae4a729f');
  console.log("  Merged Southern Ijaw II -> Southern Ijaw");
  // Add missing Kolokuma/Opokuma
  const bayelsaId = (await db.execute(sql`SELECT id FROM states WHERE name = 'Bayelsa'`)).rows[0] as any;
  const exists = await db.execute(sql`SELECT 1 FROM lgas WHERE state_id = ${bayelsaId.id} AND LOWER(name) LIKE '%kolokuma%'`);
  if (exists.rows.length === 0) {
    await db.insert(lgas).values({ stateId: bayelsaId.id, name: 'Kolokuma/Opokuma', code: 'NG006003' });
    console.log("  Created Kolokuma/Opokuma");
  }

  // YOBE: 21 -> 17
  // Duplicates: Bursari & Bursuari (keep Bursari), KARASAWA & Karasuwa (keep Karasuwa), 
  // TARMUWA & Tarmua (keep Tarmua), Yunufari & Yunusari & Yusufari (keep Yunusari + Yusufari)
  console.log("\nYobe: Merging duplicates...");
  // Merge Bursuari -> Bursari
  await mergeLga('6568b71c-099c-4639-9f20-10e4178c9bb7', 'a2a6a088-a17a-4de0-a3fe-cec497257536');
  console.log("  Merged Bursuari -> Bursari");
  // Merge KARASAWA -> Karasuwa
  await mergeLga('d0f1df21-056a-437c-895c-1ab1b09ffae8', 'e45e9fb8-645e-4125-8153-1dac861e4a23');
  console.log("  Merged KARASAWA -> Karasuwa");
  // Merge TARMUWA -> Tarmua
  await mergeLga('5c2acbf3-1d3c-4e41-bb1e-f9af5dbc1706', '66641eef-1387-42e3-80d0-561ede677283');
  console.log("  Merged TARMUWA -> Tarmua");
  // Merge Yunufari -> Yunusari
  await mergeLga('b3e36769-542d-4046-ab4e-6b87530672de', 'a4600b24-247b-426b-910b-ef4c96f7217a');
  console.log("  Merged Yunufari -> Yunusari");

  // ZAMFARA: 16 -> 14
  // Duplicates: Guasau & Gusau (keep Gusau), Talata & Talata Mafara (keep Talata Mafara)
  console.log("\nZamfara: Merging duplicates...");
  // Merge Guasau -> Gusau
  await mergeLga('9f120d48-dce6-4e2f-9bb2-3ec97d88b972', '4bd1e770-b9bc-49ea-afc2-f2a2be2513a5');
  console.log("  Merged Guasau -> Gusau");
  // Merge Talata -> Talata Mafara
  await mergeLga('8bf9aa02-f02b-4fd1-aeb8-6b09efd4aa00', '4ff9fbfc-509b-4369-98b1-54833a669b36');
  console.log("  Merged Talata -> Talata Mafara");

  // BAUCHI: 19 -> 20 (missing Jama'are and Tafawa-Balewa is "Tafawa", Dambam should be Damban, Alkalere should be Alkaleri)
  console.log("\nBauchi: Fixing...");
  const bauchiId = (await db.execute(sql`SELECT id FROM states WHERE name = 'Bauchi'`)).rows[0] as any;
  // Fix Alkalere -> Alkaleri
  await db.execute(sql`UPDATE lgas SET name = 'Alkaleri' WHERE id = 'b95b0593-700b-4513-9b5d-fa9d195c0b95'`);
  // Fix Dambam -> Damban
  await db.execute(sql`UPDATE lgas SET name = 'Damban' WHERE id = '7c3551db-2305-4157-b8df-42b91adfe24b'`);
  // Fix Tafawa -> Tafawa-Balewa
  await db.execute(sql`UPDATE lgas SET name = 'Tafawa-Balewa' WHERE id = '269223e3-c844-4b43-98a9-d5345778fa46'`);
  // Fix Itas/gadau -> Itas/Gadau
  await db.execute(sql`UPDATE lgas SET name = 'Itas/Gadau' WHERE id = 'd51cdc20-3475-4b89-98c3-a3c5b884d382'`);
  // Add missing Jama'are
  const jamExists = await db.execute(sql`SELECT 1 FROM lgas WHERE state_id = ${bauchiId.id} AND LOWER(name) LIKE '%jama%'`);
  if (jamExists.rows.length === 0) {
    await db.insert(lgas).values({ stateId: bauchiId.id, name: "Jama'are", code: 'NG005011' });
    console.log("  Created Jama'are");
  }

  // Now rename Yobe LGAs to canonical
  console.log("\nYobe: Renaming to canonical...");
  await db.execute(sql`UPDATE lgas SET name = 'Tarmua' WHERE id = '66641eef-1387-42e3-80d0-561ede677283'`);

  console.log("\n--- Final counts ---");
  const fc = (await db.execute(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM states) AS states,
      (SELECT COUNT(*)::int FROM lgas) AS lgas,
      (SELECT COUNT(*)::int FROM wards) AS wards,
      (SELECT COUNT(*)::int FROM polling_units) AS pus
  `)).rows[0] as any;
  console.log(`States: ${fc.states}, LGAs: ${fc.lgas}, Wards: ${fc.wards}, PUs: ${fc.pus}`);

  // Show per-state
  const bd = await db.execute(sql`
    SELECT s.name, COUNT(l.id)::int as cnt FROM states s LEFT JOIN lgas l ON l.state_id = s.id GROUP BY s.name ORDER BY s.name
  `);
  for (const r of bd.rows) { const row = r as any; console.log(`  ${row.name}: ${row.cnt}`); }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
