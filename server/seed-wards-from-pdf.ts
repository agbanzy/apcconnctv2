import fs from "fs";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const STATE_CODES: Record<string, string> = {
  "ABIA": "ABI", "ADAMAWA": "ADA", "AKWA IBOM": "AKW", "ANAMBRA": "ANA",
  "BAUCHI": "BAU", "BAYELSA": "BAY", "BENUE": "BEN", "BORNO": "BOR",
  "CROSS RIVER": "CRO", "DELTA": "DEL", "EBONYI": "EBO", "EDO": "EDO",
  "EKITI": "EKI", "ENUGU": "ENU", "GOMBE": "GOM", "IMO": "IMO",
  "JIGAWA": "JIG", "KADUNA": "KAD", "KANO": "KAN", "KATSINA": "KAT",
  "KEBBI": "KEB", "KOGI": "KOG", "KWARA": "KWA", "LAGOS": "LAG",
  "NASSARAWA": "NAS", "NASARAWA": "NAS", "NIGER": "NIG", "OGUN": "OGU",
  "ONDO": "OND", "OSUN": "OSU", "OYO": "OYO", "PLATEAU": "PLA",
  "RIVERS": "RIV", "SOKOTO": "SOK", "TARABA": "TAR", "YOBE": "YOB",
  "ZAMFARA": "ZAM", "FCT": "FCT",
};

const STATE_DB_NAMES: Record<string, string> = {
  "ABI": "Abia", "ADA": "Adamawa", "AKW": "Akwa Ibom", "ANA": "Anambra",
  "BAU": "Bauchi", "BAY": "Bayelsa", "BEN": "Benue", "BOR": "Borno",
  "CRO": "Cross River", "DEL": "Delta", "EBO": "Ebonyi", "EDO": "Edo",
  "EKI": "Ekiti", "ENU": "Enugu", "GOM": "Gombe", "IMO": "Imo",
  "JIG": "Jigawa", "KAD": "Kaduna", "KAN": "Kano", "KAT": "Katsina",
  "KEB": "Kebbi", "KOG": "Kogi", "KWA": "Kwara", "LAG": "Lagos",
  "NAS": "Nasarawa", "NIG": "Niger", "OGU": "Ogun", "OND": "Ondo",
  "OSU": "Osun", "OYO": "Oyo", "PLA": "Plateau", "RIV": "Rivers",
  "SOK": "Sokoto", "TAR": "Taraba", "YOB": "Yobe", "ZAM": "Zamfara",
  "FCT": "Federal Capital Territory",
};

function titleCase(str: string): string {
  return str.toLowerCase().split(/[\s]+/)
    .map((w, i, arr) => {
      if (arr.length > 1 && i > 0 && ["of", "the", "and", "in", "on", "at", "by", "for", "na"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ")
    .replace(/\bi\b/g, "I").replace(/\bii\b/g, "II").replace(/\biii\b/g, "III").replace(/\biv\b/g, "IV");
}

interface ParsedWard { name: string; wardCode: string; wardNumber: number; }
interface ParsedLga { name: string; lgaCode: string; wards: ParsedWard[]; }
interface ParsedState { name: string; stateCode: string; lgas: ParsedLga[]; }

function findStateName(lines: string[], lgaHeaderIdx: number): string {
  for (let j = lgaHeaderIdx - 1; j >= Math.max(0, lgaHeaderIdx - 5); j--) {
    const t = lines[j].trim().replace(/\s+STATE\s*$/, "");
    if (t.length >= 2 && t.length < 40 && /^[A-Z]/.test(t) && !/^\d+$/.test(t)) {
      if (STATE_CODES[t]) return t;
    }
  }
  return "";
}

function parsePdfText(filePath: string): ParsedState[] {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split("\n");

  const sectionBoundaries: { stateKey: string; startLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/LGA\s+NAME/.test(lines[i])) {
      const stateName = findStateName(lines, i);
      sectionBoundaries.push({ stateKey: stateName || "ABIA", startLine: i });
    }
  }

  const states: ParsedState[] = [];

  for (let si = 0; si < sectionBoundaries.length; si++) {
    const boundary = sectionBoundaries[si];
    const stateCode = STATE_CODES[boundary.stateKey];
    if (!stateCode) continue;

    let existingState = states.find(s => s.stateCode === stateCode);
    if (!existingState) {
      existingState = { name: boundary.stateKey, stateCode, lgas: [] };
      states.push(existingState);
    }

    const startLine = boundary.startLine;
    const endLine = si + 1 < sectionBoundaries.length ? sectionBoundaries[si + 1].startLine : lines.length;

    let headerEnd = startLine;
    for (let i = startLine; i < Math.min(startLine + 3, endLine); i++) {
      if (/LGA\s+NAME|^\s*CODE/i.test(lines[i])) headerEnd = i + 1;
    }

    let currentLga: ParsedLga | null = null;

    for (let i = headerEnd; i < endLine; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || /^\d+$/.test(trimmed) || /^LGA\s+(NAME|CODE)/i.test(trimmed) || /^\s*CODE\s*$/i.test(trimmed)) continue;

      const lgaWard = line.match(/^(\s*)([A-Z][A-Z\s/\-'.()]+?)\s{2,}(\d{2})\s{2,}(.+?)\s{2,}(\d{2})\s*$/);
      if (lgaWard && lgaWard[1].length < 3) {
        if (currentLga) existingState.lgas.push(currentLga);
        currentLga = {
          name: lgaWard[2].trim(), lgaCode: lgaWard[3],
          wards: [{ name: lgaWard[4].trim(), wardCode: lgaWard[5], wardNumber: parseInt(lgaWard[5]) }],
        };
        continue;
      }

      const lgaOnly = line.match(/^(\s*)([A-Z][A-Z\s/\-'.()]+?)\s{2,}(\d{2})\s*$/);
      if (lgaOnly && lgaOnly[1].length < 3) {
        if (currentLga) existingState.lgas.push(currentLga);
        currentLga = { name: lgaOnly[2].trim(), lgaCode: lgaOnly[3], wards: [] };
        continue;
      }

      const wardLine = line.match(/^\s{2,}(.+?)\s{2,}(\d{2})\s*$/);
      if (wardLine && currentLga) {
        const wn = wardLine[1].trim();
        if (/[A-Z]/.test(wn) && !/^LGA\s/i.test(wn) && wn !== "CODE" && wn !== "WARD") {
          currentLga.wards.push({ name: wn, wardCode: wardLine[2], wardNumber: parseInt(wardLine[2]) });
        }
      }
    }
    if (currentLga) existingState.lgas.push(currentLga);
  }

  return states;
}

async function seed(parsedStates: ParsedState[]) {
  console.log(`\nSeeding ${parsedStates.length} states...\n`);

  const dbStates = await db.query.states.findMany();
  const stateMap = new Map<string, string>();
  for (const s of dbStates) { stateMap.set(s.code, s.id); stateMap.set(s.name.toUpperCase(), s.id); }

  for (const ps of parsedStates) {
    const code = ps.stateCode;
    const name = STATE_DB_NAMES[code] || titleCase(ps.name);
    let stateId = stateMap.get(code) || stateMap.get(name.toUpperCase());

    if (!stateId) {
      const [ns] = await db.insert(schema.states).values({ name, code }).returning();
      stateId = ns.id;
      stateMap.set(code, stateId);
    }

    const existingLgas = await db.query.lgas.findMany({ where: eq(schema.lgas.stateId, stateId) });
    const lgaByName = new Map<string, { id: string; name: string }>();
    for (const l of existingLgas) lgaByName.set(l.name.toUpperCase().replace(/[\-\s]+/g, ""), { id: l.id, name: l.name });

    const lgaIdMap = new Map<string, string>();

    for (const pl of ps.lgas) {
      const lgaName = titleCase(pl.name.replace(/\s+/g, " ").trim());
      const lgaKey = pl.name.toUpperCase().replace(/[\-\s]+/g, "");
      const lgaCode = `${code}-LGA${pl.lgaCode}`;
      const existing = lgaByName.get(lgaKey);

      if (existing) {
        lgaIdMap.set(lgaCode, existing.id);
      } else {
        try {
          const [r] = await db.insert(schema.lgas).values({ stateId: stateId!, name: lgaName, code: lgaCode }).returning();
          lgaIdMap.set(lgaCode, r.id);
        } catch {
          const found = await db.query.lgas.findFirst({ where: eq(schema.lgas.code, lgaCode) });
          if (found) lgaIdMap.set(lgaCode, found.id);
        }
      }
    }

    const allWardInserts: { lgaId: string; name: string; code: string; wardNumber: number }[] = [];
    for (const pl of ps.lgas) {
      const lgaCode = `${code}-LGA${pl.lgaCode}`;
      const lgaId = lgaIdMap.get(lgaCode);
      if (!lgaId) continue;
      for (const pw of pl.wards) {
        const wardName = titleCase(pw.name.replace(/\s+/g, " ").trim()).replace(/['`\u2018\u2019]/g, "'");
        const wardCode = `${code}-LGA${pl.lgaCode}-W${pw.wardCode.padStart(2, "0")}`;
        allWardInserts.push({ lgaId, name: wardName, code: wardCode, wardNumber: pw.wardNumber });
      }
    }

    if (allWardInserts.length > 0) {
      const batchSize = 100;
      for (let b = 0; b < allWardInserts.length; b += batchSize) {
        const chunk = allWardInserts.slice(b, b + batchSize);
        try {
          await db.insert(schema.wards).values(chunk).onConflictDoNothing();
        } catch {
          for (const w of chunk) {
            try { await db.insert(schema.wards).values(w); } catch { /* skip */ }
          }
        }
      }
    }

    const wc = ps.lgas.reduce((s, l) => s + l.wards.length, 0);
    console.log(`  ${name}: ${ps.lgas.length} LGAs, ${wc} wards`);
  }
}

async function main() {
  console.log("=== Ward Data Seeder ===\n");
  const filePath = "/tmp/ward_data_layout.txt";
  if (!fs.existsSync(filePath)) { console.error("Missing text file"); process.exit(1); }

  const parsed = parsePdfText(filePath);
  let totalW = 0;
  for (const s of parsed) { totalW += s.lgas.reduce((a, l) => a + l.wards.length, 0); }
  console.log(`Parsed: ${parsed.length} states, ${parsed.reduce((a, s) => a + s.lgas.length, 0)} LGAs, ${totalW} wards`);

  await seed(parsed);

  const [sc] = await db.select({ c: sql<number>`count(*)` }).from(schema.states);
  const [lc] = await db.select({ c: sql<number>`count(*)` }).from(schema.lgas);
  const [wc] = await db.select({ c: sql<number>`count(*)` }).from(schema.wards);
  console.log(`\nDB totals: ${sc.c} states, ${lc.c} LGAs, ${wc.c} wards`);
  process.exit(0);
}

main().catch(err => { console.error("Failed:", err); process.exit(1); });
