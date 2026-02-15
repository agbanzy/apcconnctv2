import fs from 'fs';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, inArray, sql } from 'drizzle-orm';

const STATE_HEADER_TO_DB_NAME: Record<string, string> = {
  'ABIA': 'Abia',
  'ADAMAWA': 'Adamawa',
  'AKWA IBOM': 'Akwa Ibom',
  'ANAMBRA': 'Anambra',
  'BAUCHI': 'Bauchi',
  'BAYELSA': 'Bayelsa',
  'BENUE': 'Benue',
  'BORNO': 'Borno',
  'CROSS RIVER': 'Cross River',
  'DELTA': 'Delta',
  'EBONYI': 'Ebonyi',
  'EDO': 'Edo',
  'EKITI': 'Ekiti',
  'ENUGU': 'Enugu',
  'GOMBE': 'Gombe',
  'IMO': 'Imo',
  'JIGAWA': 'Jigawa',
  'KADUNA': 'Kaduna',
  'KANO': 'Kano',
  'KATSINA': 'Katsina',
  'KEBBI': 'Kebbi',
  'KOGI': 'Kogi',
  'KWARA': 'Kwara',
  'LAGOS': 'Lagos',
  'NASSARAWA': 'Nasarawa',
  'NASARAWA': 'Nasarawa',
  'NIGER': 'Niger',
  'OGUN': 'Ogun',
  'ONDO': 'Ondo',
  'OSUN': 'Osun',
  'OYO': 'Oyo',
  'PLATEAU': 'Plateau',
  'RIVERS': 'Rivers',
  'SOKOTO': 'Sokoto',
  'TARABA': 'Taraba',
  'YOBE': 'Yobe',
  'ZAMFARA': 'Zamfara',
  'FCT': 'Abuja FCT',
  'ABUJA': 'Abuja FCT',
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  'Abia': 'ABI',
  'Adamawa': 'ADA',
  'Akwa Ibom': 'AKW',
  'Anambra': 'ANA',
  'Bauchi': 'BAU',
  'Bayelsa': 'BAY',
  'Benue': 'BEN',
  'Borno': 'BOR',
  'Cross River': 'CRO',
  'Delta': 'DEL',
  'Ebonyi': 'EBO',
  'Edo': 'EDO',
  'Ekiti': 'EKI',
  'Enugu': 'ENU',
  'Federal Capital Territory': 'FED',
  'Gombe': 'GOM',
  'Imo': 'IMO',
  'Jigawa': 'JIG',
  'Kaduna': 'KAD',
  'Kano': 'KAN',
  'Katsina': 'KAT',
  'Kebbi': 'KEB',
  'Kogi': 'KOG',
  'Kwara': 'KWA',
  'Lagos': 'LAG',
  'Nasarawa': 'NAS',
  'Niger': 'NIG',
  'Ogun': 'OGU',
  'Ondo': 'OND',
  'Osun': 'OSU',
  'Oyo': 'OYO',
  'Plateau': 'PLA',
  'Rivers': 'RIV',
  'Sokoto': 'SOK',
  'Taraba': 'TAR',
  'Yobe': 'YOB',
  'Zamfara': 'ZAM',
  'Abuja FCT': 'ABU',
};

interface ParsedWard {
  name: string;
  code: string;
}

interface ParsedLGA {
  name: string;
  code: string;
  wards: ParsedWard[];
}

interface ParsedState {
  name: string;
  lgas: ParsedLGA[];
}

function toTitleCase(str: string): string {
  const romanNumerals = /^(I{1,3}|IV|VI{0,3}|IX|X{0,3}|XI{0,3}|XII{0,3})$/;
  return str
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((word) => {
      const trimmed = word.trim();
      if (!trimmed || trimmed === '-' || trimmed === '/') return word;
      const upperTrimmed = trimmed.toUpperCase();
      if (romanNumerals.test(upperTrimmed)) return upperTrimmed;
      if (trimmed.startsWith("'") || trimmed.startsWith("''")) {
        return trimmed;
      }
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join('');
}

function parseWardDataFile(filePath: string): ParsedState[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const states: ParsedState[] = [];

  let currentStateName = 'ABIA';
  let currentLGA: ParsedLGA | null = null;
  let currentState: ParsedState = { name: 'ABIA', lgas: [] };
  let pendingLGAContinuation = false;
  let isPlateauState = false;

  const lgaWardRegex = /^\s*([A-Z][A-Z /\-\.'()]+?)\s{2,}(\d{2})\s{2,}([A-Z][A-Z /\-\.'()0-9]+?)\s{2,}(\d{2})\s*$/;
  const lgaWardWithExtraColRegex = /^\s*([A-Z][A-Z /\-\.'()]+?)\s{2,}(\d{2})\s{2,}([A-Z][A-Z /\-\.'()0-9]+?)\s{2,}\d+\s{2,}(\d{2})\s*$/;
  const wardOnlyRegex = /^\s{2,}([A-Z][A-Z /\-\.'()0-9]+?)\s{2,}(\d{2})\s*$/;
  const wardOnlyWithExtraColRegex = /^\s{2,}([A-Z][A-Z /\-\.'()0-9]+?)\s{2,}\d+\s{2,}(\d{2})\s*$/;
  const pageNumberRegex = /^\s*\d{1,3}\s*$/;
  const headerRegex = /LGA\s+NAME|WARD\s+NAME/;
  const codeHeaderRegex = /^\s*CODE\s*(CODE)?\s*$/;
  const puHeaderRegex = /^\s*(OF|PU)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (pageNumberRegex.test(trimmedLine)) {
      continue;
    }

    if (headerRegex.test(trimmedLine)) {
      continue;
    }

    if (codeHeaderRegex.test(trimmedLine)) {
      continue;
    }

    if (puHeaderRegex.test(trimmedLine)) {
      continue;
    }

    const stateMatch = trimmedLine.match(/^([A-Z][A-Z ]+?)\s+STATE\s*$/);
    if (stateMatch) {
      if (currentState.lgas.length > 0 || currentLGA) {
        if (currentLGA) {
          currentState.lgas.push(currentLGA);
          currentLGA = null;
        }
        states.push(currentState);
      }
      currentStateName = stateMatch[1].trim();
      currentState = { name: currentStateName, lgas: [] };
      pendingLGAContinuation = false;
      isPlateauState = false;
      continue;
    }

    const standaloneStateNames = [
      'CROSS RIVER', 'KOGI', 'KWARA', 'LAGOS', 'NASSARAWA', 'NIGER',
      'OGUN', 'ONDO', 'OSUN', 'OYO', 'PLATEAU', 'RIVERS', 'SOKOTO',
      'TARABA', 'YOBE', 'ZAMFARA', 'FCT', 'ABUJA'
    ];

    const isIndented = /^\s{2,}/.test(line);
    if (standaloneStateNames.includes(trimmedLine) && !isIndented) {
      if (currentState.lgas.length > 0 || currentLGA) {
        if (currentLGA) {
          currentState.lgas.push(currentLGA);
          currentLGA = null;
        }
        states.push(currentState);
      }
      currentStateName = trimmedLine;
      currentState = { name: currentStateName, lgas: [] };
      pendingLGAContinuation = false;
      isPlateauState = trimmedLine === 'PLATEAU';
      continue;
    }

    if (pendingLGAContinuation && currentLGA) {
      const contMatch = trimmedLine.match(/^([A-Z][A-Z /\-\.']+)\s*$/);
      if (contMatch && !wardOnlyRegex.test(line) && !lgaWardRegex.test(line)) {
        currentLGA.name = currentLGA.name + ' ' + contMatch[1].trim();
        pendingLGAContinuation = false;
        continue;
      }
      pendingLGAContinuation = false;
    }

    const lgaWardMatch = isPlateauState
      ? line.match(lgaWardWithExtraColRegex) || line.match(lgaWardRegex)
      : line.match(lgaWardRegex);

    if (lgaWardMatch) {
      if (currentLGA) {
        currentState.lgas.push(currentLGA);
      }
      const lgaName = lgaWardMatch[1].trim();
      const lgaCode = lgaWardMatch[2];
      const wardName = lgaWardMatch[3].trim();
      const wardCode = lgaWardMatch[4];

      currentLGA = {
        name: lgaName,
        code: lgaCode,
        wards: [{ name: wardName, code: wardCode }],
      };

      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextTrimmed = nextLine.trim();
      if (
        nextTrimmed &&
        /^[A-Z][A-Z /\-\.']+$/.test(nextTrimmed) &&
        !wardOnlyRegex.test(nextLine) &&
        !lgaWardRegex.test(nextLine) &&
        !pageNumberRegex.test(nextTrimmed) &&
        !headerRegex.test(nextTrimmed) &&
        !standaloneStateNames.includes(nextTrimmed) &&
        !/STATE\s*$/.test(nextTrimmed)
      ) {
        pendingLGAContinuation = true;
      }
      continue;
    }

    const wardMatch = isPlateauState
      ? line.match(wardOnlyWithExtraColRegex) || line.match(wardOnlyRegex)
      : line.match(wardOnlyRegex);

    if (wardMatch && currentLGA) {
      const wardName = wardMatch[1].trim();
      const wardCode = wardMatch[2];
      currentLGA.wards.push({ name: wardName, code: wardCode });
      continue;
    }

    const lgaContMatch = trimmedLine.match(/^([A-Z][A-Z /\-\.']+)\s*$/);
    if (lgaContMatch && currentLGA && !standaloneStateNames.includes(trimmedLine)) {
      if (trimmedLine.length < 20 && /^[A-Z]+$/.test(trimmedLine.replace(/\s/g, ''))) {
        currentLGA.name = currentLGA.name + ' ' + lgaContMatch[1].trim();
        continue;
      }
    }

    const wardNameContRegex = /^\s{2,}([A-Z][A-Z /\-\.'()0-9]+)\s*$/;
    const wardContMatch = line.match(wardNameContRegex);
    if (wardContMatch && currentLGA && currentLGA.wards.length > 0) {
      const lastWard = currentLGA.wards[currentLGA.wards.length - 1];
      const contText = wardContMatch[1].trim();
      if (!/^\d{2}$/.test(contText) && !pageNumberRegex.test(contText)) {
        lastWard.name = lastWard.name + ' ' + contText;
        continue;
      }
    }
  }

  if (currentLGA) {
    currentState.lgas.push(currentLGA);
  }
  if (currentState.lgas.length > 0) {
    states.push(currentState);
  }

  return states;
}

async function seedWardsFromPdf() {
  console.log('=== Ward Seeding from PDF Text ===\n');

  const filePath = '/tmp/ward_data_layout.txt';
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('Step 1: Parsing ward data file...');
  const parsedStates = parseWardDataFile(filePath);
  console.log(`  Parsed ${parsedStates.length} states from file`);

  for (const s of parsedStates) {
    const totalWards = s.lgas.reduce((sum, l) => sum + l.wards.length, 0);
    console.log(`  - ${s.name}: ${s.lgas.length} LGAs, ${totalWards} wards`);
  }

  console.log('\nStep 2: Looking up states in database...');
  const dbStates = await db.select().from(schema.states);
  const stateMap = new Map<string, { id: string; code: string; name: string }>();
  for (const s of dbStates) {
    stateMap.set(s.name, { id: s.id, code: s.code, name: s.name });
  }

  let totalStatesProcessed = 0;
  let totalLGAs = 0;
  let totalWards = 0;

  console.log('\nStep 3: Temporarily allowing NULL ward_id on members...');
  await db.execute(sql`ALTER TABLE members ALTER COLUMN ward_id DROP NOT NULL`);

  console.log('\nStep 4: Processing each state...\n');

  for (const parsedState of parsedStates) {
    const dbStateName = STATE_HEADER_TO_DB_NAME[parsedState.name];
    if (!dbStateName) {
      console.warn(`  WARNING: No DB mapping for state "${parsedState.name}", skipping`);
      continue;
    }

    const stateInfo = stateMap.get(dbStateName);
    if (!stateInfo) {
      console.warn(`  WARNING: State "${dbStateName}" not found in database, skipping`);
      continue;
    }

    const stateCode = stateInfo.code;
    console.log(`Processing: ${dbStateName} (${stateCode})...`);

    try {
      await db.transaction(async (tx) => {
        const existingLGAs = await tx
          .select({ id: schema.lgas.id })
          .from(schema.lgas)
          .where(eq(schema.lgas.stateId, stateInfo.id));

        const existingLGAIds = existingLGAs.map((l) => l.id);

        if (existingLGAIds.length > 0) {
          const existingWards = await tx
            .select({ id: schema.wards.id })
            .from(schema.wards)
            .where(inArray(schema.wards.lgaId, existingLGAIds));
          const existingWardIds = existingWards.map((w) => w.id);

          if (existingWardIds.length > 0) {
            const wardIdList = existingWardIds.map(id => sql`${id}`);
            const wardIdsSql = sql.join(wardIdList, sql`, `);

            await tx.execute(sql`UPDATE members SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE elections SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE events SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE volunteer_tasks SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE issue_campaigns SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE micro_tasks SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);
            await tx.execute(sql`UPDATE news_posts SET ward_id = NULL WHERE ward_id IN (${wardIdsSql})`);

            await tx
              .delete(schema.wards)
              .where(inArray(schema.wards.lgaId, existingLGAIds));
          }

          const lgaIdList = existingLGAIds.map(id => sql`${id}`);
          const lgaIdsSql = sql.join(lgaIdList, sql`, `);

          await tx.execute(sql`UPDATE elections SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);
          await tx.execute(sql`UPDATE events SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);
          await tx.execute(sql`UPDATE volunteer_tasks SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);
          await tx.execute(sql`UPDATE issue_campaigns SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);
          await tx.execute(sql`UPDATE micro_tasks SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);
          await tx.execute(sql`UPDATE news_posts SET lga_id = NULL WHERE lga_id IN (${lgaIdsSql})`);

          await tx
            .delete(schema.lgas)
            .where(eq(schema.lgas.stateId, stateInfo.id));
        }

        for (const parsedLGA of parsedState.lgas) {
          const lgaName = toTitleCase(parsedLGA.name);
          const lgaCode = `${stateCode}-${parsedLGA.code.padStart(2, '0')}`;

          const [insertedLGA] = await tx
            .insert(schema.lgas)
            .values({
              stateId: stateInfo.id,
              name: lgaName,
              code: lgaCode,
            })
            .returning({ id: schema.lgas.id });

          const seenWardNames = new Set<string>();
          const wardValues = parsedLGA.wards.map((ward) => {
            let wardName = toTitleCase(ward.name);
            const wardCode = `${stateCode}-${parsedLGA.code.padStart(2, '0')}-${ward.code.padStart(2, '0')}`;
            const wardNumber = parseInt(ward.code, 10);

            if (seenWardNames.has(wardName)) {
              wardName = `${wardName} (Ward ${ward.code})`;
            }
            seenWardNames.add(wardName);

            return {
              lgaId: insertedLGA.id,
              name: wardName,
              code: wardCode,
              wardNumber: wardNumber,
            };
          });

          if (wardValues.length > 0) {
            await tx.insert(schema.wards).values(wardValues);
          }

          totalLGAs++;
          totalWards += parsedLGA.wards.length;
        }
      });

      totalStatesProcessed++;
      const stateWards = parsedState.lgas.reduce((sum, l) => sum + l.wards.length, 0);
      console.log(`  Done: ${parsedState.lgas.length} LGAs, ${stateWards} wards inserted`);
    } catch (error: any) {
      console.error(`  ERROR processing ${dbStateName}: ${error.message}`);
      throw error;
    }
  }

  console.log('\nStep 5: Restoring NOT NULL constraint on members.ward_id...');
  const membersWithNullWard = await db.execute(sql`SELECT COUNT(*) as cnt FROM members WHERE ward_id IS NULL`);
  console.log(`  Members with NULL ward_id: ${(membersWithNullWard as any).rows?.[0]?.cnt ?? 'unknown'}`);

  console.log('\n=== Summary ===');
  console.log(`States processed: ${totalStatesProcessed}`);
  console.log(`Total LGAs inserted: ${totalLGAs}`);
  console.log(`Total Wards inserted: ${totalWards}`);
  console.log('\nDone!');

  process.exit(0);
}

seedWardsFromPdf().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
