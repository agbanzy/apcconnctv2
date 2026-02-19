import { db } from "./db.js";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

const PARTIES = [
  { name: "All Progressives Congress", abbreviation: "APC", color: "#008751", founded: 2013 },
  { name: "Peoples Democratic Party", abbreviation: "PDP", color: "#E41E20", founded: 1998 },
  { name: "Labour Party", abbreviation: "LP", color: "#D4AF37", founded: 2002 },
  { name: "New Nigeria Peoples Party", abbreviation: "NNPP", color: "#FF6600", founded: 2001 },
  { name: "All Progressives Grand Alliance", abbreviation: "APGA", color: "#800080", founded: 2002 },
  { name: "African Democratic Congress", abbreviation: "ADC", color: "#0047AB", founded: 2006 },
  { name: "Social Democratic Party", abbreviation: "SDP", color: "#FF1493", founded: 2012 },
  { name: "Peoples Redemption Party", abbreviation: "PRP", color: "#8B0000", founded: 1978 },
  { name: "Young Progressives Party", abbreviation: "YPP", color: "#00CED1", founded: 2017 },
  { name: "African Action Congress", abbreviation: "AAC", color: "#228B22", founded: 2018 },
  { name: "Action Democratic Party", abbreviation: "ADP", color: "#4169E1", founded: 2017 },
  { name: "Action Alliance", abbreviation: "AA", color: "#DAA520", founded: 2005 },
  { name: "Accord", abbreviation: "A", color: "#2F4F4F", founded: 2006 },
  { name: "National Rescue Movement", abbreviation: "NRM", color: "#556B2F", founded: 2013 },
  { name: "Zenith Labour Party", abbreviation: "ZLP", color: "#708090", founded: 2018 },
  { name: "Allied Peoples Movement", abbreviation: "APM", color: "#B8860B", founded: 2018 },
  { name: "Action Peoples Party", abbreviation: "APP", color: "#A0522D", founded: null },
  { name: "Boot Party", abbreviation: "BP", color: "#6B8E23", founded: null },
  { name: "Youth Party", abbreviation: "YP", color: "#20B2AA", founded: null },
  { name: "Democratic Leadership Alliance", abbreviation: "DLA", color: "#4682B4", founded: 2026 },
  { name: "Nigeria Democratic Congress", abbreviation: "NDC", color: "#CD853F", founded: 2026 },
];

async function seedParties() {
  console.log("Seeding 21 INEC-registered political parties...");
  let created = 0;
  let skipped = 0;

  for (const party of PARTIES) {
    const existing = await db.query.parties.findFirst({
      where: eq(schema.parties.abbreviation, party.abbreviation),
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(schema.parties).values({
      name: party.name,
      abbreviation: party.abbreviation,
      color: party.color,
      founded: party.founded,
      isActive: true,
    });
    created++;
  }

  console.log(`Done: ${created} created, ${skipped} already existed.`);
}

seedParties()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
