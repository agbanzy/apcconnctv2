import xlsx from "xlsx";
import { db } from "../db";
import { states, lgas, wards } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import path from "path";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\/\-\s\(\),.']+/g, '');
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({length: m+1}, () => Array(n+1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}

function sim(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 0 : 1 - lev(na, nb) / max;
}

async function mergeLgaInto(sourceId: string, targetId: string, sourceName: string) {
  const srcWards = await db.select().from(wards).where(eq(wards.lgaId, sourceId));
  const tgtWards = await db.select().from(wards).where(eq(wards.lgaId, targetId));
  const tgtNames = new Map(tgtWards.map(w => [norm(w.name), w.id]));

  for (const sw of srcWards) {
    const existing = tgtNames.get(norm(sw.name));
    if (existing) {
      await db.execute(sql`UPDATE polling_units SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE members SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE events SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE news_posts SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE micro_tasks SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE volunteer_tasks SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.execute(sql`UPDATE issue_campaigns SET ward_id = ${existing} WHERE ward_id = ${sw.id}`);
      await db.delete(wards).where(eq(wards.id, sw.id));
    } else {
      await db.update(wards).set({ lgaId: targetId }).where(eq(wards.id, sw.id));
    }
  }

  for (const tbl of ['events', 'news_posts', 'issue_campaigns', 'micro_tasks', 'volunteer_tasks']) {
    await db.execute(sql.raw(`UPDATE ${tbl} SET lga_id = '${targetId}' WHERE lga_id = '${sourceId}'`));
  }

  await db.delete(lgas).where(eq(lgas.id, sourceId));
}

async function run() {
  console.log("=== Fixing remaining LGA duplicates ===\n");

  const xlsxPath = path.join(process.cwd(), "attached_assets", "nga_admin_boundaries_1762975238593.xlsx");
  const wb = xlsx.readFile(xlsxPath);
  const excelLGAs: {adm2_name: string; adm2_pcode: string; adm1_name: string}[] = xlsx.utils.sheet_to_json(wb.Sheets["nga_admin2"]);

  const excelByState = new Map<string, string[]>();
  for (const el of excelLGAs) {
    const sn = el.adm1_name === "FCT" ? "Federal Capital Territory" : el.adm1_name;
    if (!excelByState.has(sn)) excelByState.set(sn, []);
    excelByState.get(sn)!.push(el.adm2_name);
  }

  const dbStates = await db.select().from(states);

  for (const state of dbStates) {
    const canonical = excelByState.get(state.name);
    if (!canonical) {
      const altName = Object.keys(Object.fromEntries(excelByState)).find(k => sim(k, state.name) > 0.8);
      if (altName) {
        const c = excelByState.get(altName)!;
        await fixState(state.id, state.name, c);
      }
      continue;
    }
    await fixState(state.id, state.name, canonical);
  }

  // Fix orphaned wards
  console.log("\n--- Fixing orphaned wards ---");
  const ow = await db.execute(sql`SELECT id FROM wards WHERE lga_id NOT IN (SELECT id FROM lgas)`);
  for (const r of ow.rows) {
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
  console.log(`  Fixed ${ow.rows.length} orphaned wards`);

  // Fix orphaned PUs in batches 
  console.log("\n--- Fixing orphaned polling units ---");
  // First clean references
  await db.execute(sql`DELETE FROM polling_unit_results WHERE polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
  await db.execute(sql`DELETE FROM incidents WHERE polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
  await db.execute(sql`DELETE FROM result_sheets WHERE polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
  await db.execute(sql`DELETE FROM polling_agents WHERE polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);

  let totalDeleted = 0;
  while (true) {
    const r = await db.execute(sql`
      WITH orphans AS (
        SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards) LIMIT 10000
      )
      DELETE FROM polling_units WHERE id IN (SELECT id FROM orphans)
    `);
    const c = r.rowCount || 0;
    totalDeleted += c;
    if (c === 0) break;
    console.log(`  Deleted ${totalDeleted}...`);
  }
  console.log(`  Total deleted: ${totalDeleted}`);

  // Fix invalid member refs
  await db.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)`);

  // Final counts
  console.log("\n--- FINAL COUNTS ---");
  const fc = (await db.execute(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM states) AS states,
      (SELECT COUNT(*)::int FROM lgas) AS lgas,
      (SELECT COUNT(*)::int FROM wards) AS wards,
      (SELECT COUNT(*)::int FROM polling_units) AS pus,
      (SELECT COUNT(*)::int FROM lgas WHERE state_id NOT IN (SELECT id FROM states)) AS orphan_lgas,
      (SELECT COUNT(*)::int FROM wards WHERE lga_id NOT IN (SELECT id FROM lgas)) AS orphan_wards,
      (SELECT COUNT(*)::int FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards)) AS orphan_pus
  `)).rows[0] as any;

  console.log(`  States: ${fc.states}`);
  console.log(`  LGAs: ${fc.lgas} (expected 774)`);
  console.log(`  Wards: ${fc.wards}`);
  console.log(`  Polling Units: ${fc.pus}`);
  console.log(`  Orphan LGAs: ${fc.orphan_lgas}, Wards: ${fc.orphan_wards}, PUs: ${fc.orphan_pus}`);

  const bd = await db.execute(sql`
    SELECT s.name, COUNT(l.id)::int as cnt FROM states s LEFT JOIN lgas l ON l.state_id = s.id GROUP BY s.name ORDER BY s.name
  `);
  console.log("\n  Per-state LGA counts:");
  for (const r of bd.rows) { const row = r as any; console.log(`    ${row.name}: ${row.cnt}`); }
}

async function fixState(stateId: string, stateName: string, canonical: string[]) {
  const dbLGAs = await db.select().from(lgas).where(eq(lgas.stateId, stateId));
  if (dbLGAs.length === canonical.length) return;
  if (dbLGAs.length < canonical.length) {
    console.log(`  ${stateName}: ${dbLGAs.length} < ${canonical.length} (need to add)`);
    return;
  }

  console.log(`  ${stateName}: DB=${dbLGAs.length}, Expected=${canonical.length}`);

  const claimed = new Set<string>();
  const canonicalToDb = new Map<string, string>();

  // Greedy assignment by highest similarity
  const allPairs: {cName: string; dbId: string; dbName: string; score: number}[] = [];
  for (const cn of canonical) {
    for (const dl of dbLGAs) {
      allPairs.push({ cName: cn, dbId: dl.id, dbName: dl.name, score: sim(cn, dl.name) });
    }
  }
  allPairs.sort((a, b) => b.score - a.score);

  const assignedC = new Set<string>();
  for (const p of allPairs) {
    if (claimed.has(p.dbId) || assignedC.has(p.cName)) continue;
    if (p.score >= 0.4) {
      claimed.add(p.dbId);
      assignedC.add(p.cName);
      canonicalToDb.set(p.cName, p.dbId);
      if (p.score < 0.9) console.log(`    Match: "${p.cName}" <-> "${p.dbName}" (${p.score.toFixed(2)})`);
    }
  }

  // Unmatched canonicals
  for (const cn of canonical) {
    if (!assignedC.has(cn)) {
      console.log(`    Need to CREATE: "${cn}"`);
      const [newLga] = await db.insert(lgas).values({
        stateId, name: cn, code: `LGA-${norm(cn).substring(0,8).toUpperCase()}`,
      }).returning();
      canonicalToDb.set(cn, newLga.id);
      claimed.add(newLga.id);
    }
  }

  // Merge duplicates
  const dups = dbLGAs.filter(dl => !claimed.has(dl.id));
  for (const dup of dups) {
    let best: {name: string; id: string; score: number} | null = null;
    for (const [cn, cid] of canonicalToDb) {
      const s = sim(dup.name, cn);
      if (!best || s > best.score) best = { name: cn, id: cid, score: s };
    }
    console.log(`    Merge: "${dup.name}" -> "${best!.name}" (${best!.score.toFixed(2)})`);
    await mergeLgaInto(dup.id, best!.id, dup.name);
  }

  // Rename to canonical names
  const refreshed = await db.select().from(lgas).where(eq(lgas.stateId, stateId));
  for (const [cn, cid] of canonicalToDb) {
    const cur = refreshed.find(l => l.id === cid);
    if (cur && cur.name !== cn) {
      try {
        await db.update(lgas).set({ name: cn }).where(eq(lgas.id, cid));
      } catch(e: any) {
        if (e.code !== '23505') throw e;
      }
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
