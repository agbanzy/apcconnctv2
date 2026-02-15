import xlsx from "xlsx";
import { db } from "../db";
import { states, lgas, wards, pollingUnits } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import path from "path";

interface ExcelLGA {
  adm2_name: string;
  adm2_pcode: string;
  adm1_name: string;
  adm1_pcode: string;
}

interface ExcelWard {
  adm3_name: string;
  adm3_pcode: string;
  adm2_pcode: string;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\/\-\s\(\)]+/g, '').replace(/,/g, '');
}

function normSpaced(s: string): string {
  return s.trim().toLowerCase().replace(/[\/\-]+/g, ' ').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(na, nb) / maxLen;
}

async function mergeWards(sourceWardId: string, targetWardId: string) {
  await db.execute(sql`UPDATE polling_units SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE members SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE events SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE news_posts SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE micro_tasks SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE volunteer_tasks SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.execute(sql`UPDATE issue_campaigns SET ward_id = ${targetWardId} WHERE ward_id = ${sourceWardId}`);
  await db.delete(wards).where(eq(wards.id, sourceWardId));
}

async function mergeLGA(sourceLgaId: string, targetLgaId: string) {
  const sourceWards = await db.select().from(wards).where(eq(wards.lgaId, sourceLgaId));
  const targetWards = await db.select().from(wards).where(eq(wards.lgaId, targetLgaId));
  const targetNames = new Map(targetWards.map(w => [norm(w.name), w.id]));

  for (const sw of sourceWards) {
    const existing = targetNames.get(norm(sw.name));
    if (existing) {
      await mergeWards(sw.id, existing);
    } else {
      await db.update(wards).set({ lgaId: targetLgaId }).where(eq(wards.id, sw.id));
    }
  }

  await db.execute(sql`UPDATE events SET lga_id = ${targetLgaId} WHERE lga_id = ${sourceLgaId}`);
  await db.execute(sql`UPDATE news_posts SET lga_id = ${targetLgaId} WHERE lga_id = ${sourceLgaId}`);
  await db.execute(sql`UPDATE issue_campaigns SET lga_id = ${targetLgaId} WHERE lga_id = ${sourceLgaId}`);
  await db.execute(sql`UPDATE micro_tasks SET lga_id = ${targetLgaId} WHERE lga_id = ${sourceLgaId}`);
  await db.execute(sql`UPDATE volunteer_tasks SET lga_id = ${targetLgaId} WHERE lga_id = ${sourceLgaId}`);
  await db.delete(lgas).where(eq(lgas.id, sourceLgaId));
}

export async function rebuildAdminBoundaries() {
  console.log("=== ADMIN BOUNDARIES REBUILD ===\n");

  const xlsxPath = path.join(process.cwd(), "attached_assets", "nga_admin_boundaries_1762975238593.xlsx");
  const wb = xlsx.readFile(xlsxPath);

  const excelLGAs: ExcelLGA[] = xlsx.utils.sheet_to_json(wb.Sheets["nga_admin2"]);
  const excelWards: ExcelWard[] = xlsx.utils.sheet_to_json(wb.Sheets["nga_admin3"]);
  const excelStates: { adm1_name: string; adm1_pcode: string }[] = xlsx.utils.sheet_to_json(wb.Sheets["nga_admin1"]);

  console.log(`Excel source: ${excelStates.length} states, ${excelLGAs.length} LGAs, ${excelWards.length} wards`);

  const dbStates = await db.select().from(states);
  console.log(`DB has ${dbStates.length} states`);

  const stateNormToId = new Map<string, string>();
  for (const s of dbStates) {
    stateNormToId.set(norm(s.name), s.id);
  }

  const pcodeToStateName = new Map<string, string>();
  for (const es of excelStates) {
    pcodeToStateName.set(es.adm1_pcode, es.adm1_name === "FCT" ? "Federal Capital Territory" : es.adm1_name);
  }

  // Group excel LGAs by state
  const excelLGAsByState = new Map<string, ExcelLGA[]>();
  for (const el of excelLGAs) {
    if (!excelLGAsByState.has(el.adm1_pcode)) excelLGAsByState.set(el.adm1_pcode, []);
    excelLGAsByState.get(el.adm1_pcode)!.push(el);
  }

  let totalMerged = 0, totalCreated = 0, totalRenamed = 0;

  // PHASE 1: Deduplicate and fix LGAs per state
  console.log("\n--- PHASE 1: LGA Deduplication ---");

  for (const [pcode, canonicals] of excelLGAsByState) {
    const stateName = pcodeToStateName.get(pcode);
    if (!stateName) continue;
    const stateId = stateNormToId.get(norm(stateName));
    if (!stateId) { console.log(`  State "${stateName}" not found`); continue; }

    let dbLGAsForState = await db.select().from(lgas).where(eq(lgas.stateId, stateId));
    if (dbLGAsForState.length === canonicals.length) continue;

    console.log(`\n  ${stateName}: DB=${dbLGAsForState.length}, Expected=${canonicals.length}`);

    // For each canonical LGA, find all potential DB matches and group them
    type MatchGroup = { canonical: ExcelLGA; dbMatches: { id: string; name: string; score: number }[] };
    const groups: MatchGroup[] = [];
    const claimed = new Set<string>();

    // Sort canonicals by how many strong matches they have (hardest first)
    for (const cl of canonicals) {
      const matches: { id: string; name: string; score: number }[] = [];
      for (const dl of dbLGAsForState) {
        const score = similarity(cl.adm2_name, dl.name);
        if (score >= 0.5) matches.push({ id: dl.id, name: dl.name, score });
      }
      matches.sort((a, b) => b.score - a.score);
      groups.push({ canonical: cl, dbMatches: matches });
    }

    // Assign best matches greedily (highest score first across all groups)
    const canonicalToDbId = new Map<string, string>();
    const allAssignments: { canonicalName: string; dbId: string; dbName: string; score: number }[] = [];

    for (const g of groups) {
      for (const m of g.dbMatches) {
        allAssignments.push({ canonicalName: g.canonical.adm2_name, dbId: m.id, dbName: m.name, score: m.score });
      }
    }
    allAssignments.sort((a, b) => b.score - a.score);

    const assignedCanonicals = new Set<string>();
    for (const a of allAssignments) {
      if (claimed.has(a.dbId) || assignedCanonicals.has(a.canonicalName)) continue;
      claimed.add(a.dbId);
      assignedCanonicals.add(a.canonicalName);
      canonicalToDbId.set(a.canonicalName, a.dbId);
      if (a.score < 1.0) {
        console.log(`    Matched: "${a.canonicalName}" <-> "${a.dbName}" (${a.score.toFixed(2)})`);
      }
    }

    // Merge unclaimed DB LGAs (duplicates) into their best canonical match
    const unclaimed = dbLGAsForState.filter(dl => !claimed.has(dl.id));
    for (const dup of unclaimed) {
      let bestTarget: { name: string; id: string; score: number } | null = null;
      for (const [cName, cId] of canonicalToDbId) {
        const score = similarity(dup.name, cName);
        if (!bestTarget || score > bestTarget.score) {
          bestTarget = { name: cName, id: cId, score };
        }
      }
      if (bestTarget) {
        console.log(`    Merging dup: "${dup.name}" -> "${bestTarget.name}" (${bestTarget.score.toFixed(2)})`);
        await mergeLGA(dup.id, bestTarget.id);
        totalMerged++;
      }
    }

    // Create any unassigned canonicals
    for (const cl of canonicals) {
      if (!assignedCanonicals.has(cl.adm2_name)) {
        console.log(`    Creating: "${cl.adm2_name}"`);
        const [newLGA] = await db.insert(lgas).values({
          stateId,
          name: cl.adm2_name,
          code: cl.adm2_pcode,
        }).returning();
        canonicalToDbId.set(cl.adm2_name, newLGA.id);
        totalCreated++;
      }
    }

    // Now rename matched LGAs to canonical names (after all merges)
    dbLGAsForState = await db.select().from(lgas).where(eq(lgas.stateId, stateId));
    for (const [cName, cId] of canonicalToDbId) {
      const dbLga = dbLGAsForState.find(l => l.id === cId);
      if (dbLga && dbLga.name !== cName) {
        const cl = canonicals.find(c => c.adm2_name === cName);
        try {
          await db.update(lgas).set({ name: cName, code: cl?.adm2_pcode || dbLga.code }).where(eq(lgas.id, cId));
          totalRenamed++;
        } catch (e: any) {
          if (e.code === '23505') {
            console.log(`    Name conflict renaming "${dbLga.name}" -> "${cName}", skipping`);
          } else throw e;
        }
      }
    }
  }

  console.log(`\n  Merged: ${totalMerged}, Created: ${totalCreated}, Renamed: ${totalRenamed}`);

  // PHASE 2: Fix orphaned wards
  console.log("\n--- PHASE 2: Orphaned Wards ---");
  const orphanedWards = await db.execute(sql`
    SELECT w.id, w.name FROM wards w WHERE w.lga_id NOT IN (SELECT id FROM lgas)
  `);
  if (orphanedWards.rows.length > 0) {
    console.log(`  Cleaning ${orphanedWards.rows.length} orphaned wards`);
    for (const ow of orphanedWards.rows) {
      const wId = ow.id as string;
      await db.execute(sql`DELETE FROM polling_units WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE events SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE news_posts SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE micro_tasks SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE volunteer_tasks SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.execute(sql`UPDATE issue_campaigns SET ward_id = NULL WHERE ward_id = ${wId}`);
      await db.delete(wards).where(eq(wards.id, wId));
    }
  } else {
    console.log("  None found");
  }

  // PHASE 3: Fix orphaned polling units
  console.log("\n--- PHASE 3: Orphaned Polling Units ---");
  const opuResult = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards)`);
  const opuCount = (opuResult.rows[0] as any).cnt;
  if (opuCount > 0) {
    console.log(`  Cleaning references for ${opuCount} orphaned PUs`);
    await db.execute(sql`DELETE FROM polling_unit_results WHERE polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
    await db.execute(sql`DELETE FROM incidents WHERE polling_unit_id IS NOT NULL AND polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
    await db.execute(sql`DELETE FROM polling_agents WHERE polling_unit_id IS NOT NULL AND polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);
    await db.execute(sql`DELETE FROM result_sheets WHERE polling_unit_id IS NOT NULL AND polling_unit_id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards))`);

    let deleted = 0;
    while (true) {
      const r = await db.execute(sql`DELETE FROM polling_units WHERE id IN (SELECT id FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards) LIMIT 5000)`);
      const c = r.rowCount || 0;
      deleted += c;
      if (c === 0) break;
      if (deleted % 10000 === 0) console.log(`    Deleted ${deleted}...`);
    }
    console.log(`  Deleted ${deleted} orphaned PUs`);
  } else {
    console.log("  None found");
  }

  // PHASE 4: Fix invalid member references
  console.log("\n--- PHASE 4: Invalid Member References ---");
  const imResult = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM members WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)`);
  const imCount = (imResult.rows[0] as any).cnt;
  if (imCount > 0) {
    console.log(`  Clearing ${imCount} invalid ward refs`);
    await db.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)`);
  } else {
    console.log("  None found");
  }

  // PHASE 5: Seed missing wards from Excel
  console.log("\n--- PHASE 5: Seed Missing Wards ---");
  const allDbLGAs = await db.select().from(lgas);
  const lgaPcodeToDbId = new Map<string, string>();

  for (const el of excelLGAs) {
    const stateName = el.adm1_name === "FCT" ? "Federal Capital Territory" : el.adm1_name;
    const stateId = stateNormToId.get(norm(stateName));
    if (!stateId) continue;
    const stateLGAs = allDbLGAs.filter(l => l.stateId === stateId);
    let best: { id: string; score: number } | null = null;
    for (const dl of stateLGAs) {
      const s = similarity(el.adm2_name, dl.name);
      if (!best || s > best.score) best = { id: dl.id, score: s };
    }
    if (best && best.score >= 0.4) lgaPcodeToDbId.set(el.adm2_pcode, best.id);
  }

  let wardsAdded = 0;
  for (const ew of excelWards) {
    const lgaDbId = lgaPcodeToDbId.get(ew.adm2_pcode);
    if (!lgaDbId) continue;
    try {
      const exists = await db.execute(sql`
        SELECT 1 FROM wards WHERE lga_id = ${lgaDbId} AND LOWER(REPLACE(REPLACE(name, '-', ''), ' ', '')) = ${norm(ew.adm3_name)} LIMIT 1
      `);
      if (exists.rows.length === 0) {
        await db.insert(wards).values({ lgaId: lgaDbId, name: ew.adm3_name, code: ew.adm3_pcode });
        wardsAdded++;
      }
    } catch (e: any) {
      if (e.code !== '23505') throw e;
    }
  }
  console.log(`  Added ${wardsAdded} wards`);

  // PHASE 6: Final validation
  console.log("\n--- FINAL VALIDATION ---");
  const fc = (await db.execute(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM states) AS states,
      (SELECT COUNT(*)::int FROM lgas) AS lgas,
      (SELECT COUNT(*)::int FROM wards) AS wards,
      (SELECT COUNT(*)::int FROM polling_units) AS pus,
      (SELECT COUNT(*)::int FROM lgas WHERE state_id NOT IN (SELECT id FROM states)) AS orphan_lgas,
      (SELECT COUNT(*)::int FROM wards WHERE lga_id NOT IN (SELECT id FROM lgas)) AS orphan_wards,
      (SELECT COUNT(*)::int FROM polling_units WHERE ward_id NOT IN (SELECT id FROM wards)) AS orphan_pus,
      (SELECT COUNT(*)::int FROM members WHERE ward_id IS NOT NULL AND ward_id NOT IN (SELECT id FROM wards)) AS invalid_members
  `)).rows[0] as any;

  console.log(`  States: ${fc.states} (expected 37)`);
  console.log(`  LGAs: ${fc.lgas} (expected 774)`);
  console.log(`  Wards: ${fc.wards}`);
  console.log(`  Polling Units: ${fc.pus}`);
  console.log(`  Orphaned LGAs: ${fc.orphan_lgas}`);
  console.log(`  Orphaned Wards: ${fc.orphan_wards}`);
  console.log(`  Orphaned PUs: ${fc.orphan_pus}`);
  console.log(`  Invalid member wards: ${fc.invalid_members}`);

  const breakdown = await db.execute(sql`
    SELECT s.name, COUNT(l.id)::int as lga_count
    FROM states s LEFT JOIN lgas l ON l.state_id = s.id
    GROUP BY s.name ORDER BY s.name
  `);
  console.log("\n  LGAs per state:");
  for (const r of breakdown.rows) {
    const row = r as any;
    console.log(`    ${row.name}: ${row.lga_count}`);
  }

  console.log("\n=== REBUILD COMPLETE ===");
}

rebuildAdminBoundaries().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
