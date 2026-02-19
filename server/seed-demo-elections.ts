import { db } from "./db";
import { generalElections, generalElectionCandidates, parties, states, lgas } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export async function seedDemoElections(): Promise<{ electionsCreated: number; candidatesCreated: number }> {
  console.log("Seeding demo election data...");

  const allParties = await db.query.parties.findMany();
  const allStates = await db.query.states.findMany();
  const allLgas = await db.query.lgas.findMany();

  const apc = allParties.find(p => p.abbreviation === "APC");
  const pdp = allParties.find(p => p.abbreviation === "PDP");
  const lp = allParties.find(p => p.abbreviation === "LP");
  const nnpp = allParties.find(p => p.abbreviation === "NNPP");
  const adp = allParties.find(p => p.abbreviation === "ADP");
  const sdp = allParties.find(p => p.abbreviation === "SDP");
  const apga = allParties.find(p => p.abbreviation === "APGA");
  const adc = allParties.find(p => p.abbreviation === "ADC");
  const ypp = allParties.find(p => p.abbreviation === "YPP");
  const aac = allParties.find(p => p.abbreviation === "AAC");

  if (!apc || !pdp || !lp || !nnpp) {
    throw new Error("Required parties (APC, PDP, LP, NNPP) not found. Seed parties first.");
  }

  const findState = (name: string) => allStates.find(s => s.name.toUpperCase().includes(name.toUpperCase()));
  const lagos = findState("Lagos");
  const kano = findState("Kano");
  const rivers = findState("Rivers");
  const kaduna = findState("Kaduna");
  const oyo = findState("Oyo");
  const anambra = findState("Anambra");

  const fct = allStates.find(s => s.name.toUpperCase().includes("FCT") || s.name.toUpperCase().includes("FEDERAL CAPITAL"));

  const fctLgas = fct ? allLgas.filter(l => l.stateId === fct.id) : [];
  const findFctLga = (name: string) => fctLgas.find(l => l.name.toUpperCase().includes(name.toUpperCase()));

  const demoElections = [
    {
      title: "2027 Presidential Election",
      description: "General election for the President of the Federal Republic of Nigeria",
      electionYear: 2027,
      electionDate: new Date("2027-02-25"),
      position: "presidential" as const,
      status: "upcoming" as const,
      stateId: null,
      lgaId: null,
      candidates: [
        { name: "Bola Ahmed Tinubu", partyId: apc.id, runningMate: "Kashim Shettima", votes: 8794726 },
        { name: "Atiku Abubakar", partyId: pdp.id, runningMate: "Ifeanyi Okowa", votes: 6984520 },
        { name: "Peter Obi", partyId: lp.id, runningMate: "Yusuf Datti Baba-Ahmed", votes: 6101533 },
        { name: "Rabiu Kwankwaso", partyId: nnpp.id, runningMate: "Isaac Idahosa", votes: 1496687 },
      ],
    },
    {
      title: "2025 Presidential Election",
      description: "Most recent presidential election results",
      electionYear: 2025,
      electionDate: new Date("2025-02-22"),
      position: "presidential" as const,
      status: "completed" as const,
      stateId: null,
      lgaId: null,
      candidates: [
        { name: "Ahmed Bola Tinubu", partyId: apc.id, runningMate: "Kashim Shettima", votes: 9245810 },
        { name: "Atiku Abubakar", partyId: pdp.id, runningMate: "Peter Obi", votes: 7380331 },
        { name: "Peter Gregory Obi", partyId: lp.id, runningMate: "Yusuf Datti", votes: 6420177 },
        { name: "Rabiu Musa Kwankwaso", partyId: nnpp.id, runningMate: "Bishop Isaac", votes: 1580042 },
        ...(adp ? [{ name: "Dumebi Kachikwu", partyId: adp.id, runningMate: "Haliru Salihu", votes: 78422 }] : []),
        ...(sdp ? [{ name: "Adewole Adebayo", partyId: sdp.id, runningMate: "Ifunanya Ajaegbu", votes: 52428 }] : []),
      ],
    },
  ];

  const governorshipElections = [
    { state: lagos, title: "2027 Lagos Governorship Election", year: 2027, status: "upcoming" as const, candidates: [
      { name: "Babajide Sanwo-Olu", partyId: apc.id, runningMate: "Kadri Obafemi Hamzat", votes: 0 },
      { name: "Gbadebo Rhodes-Vivour", partyId: lp.id, runningMate: "Funke Akindele", votes: 0 },
      { name: "Abdul-Azeez Adediran", partyId: pdp.id, runningMate: "Funke Akindele", votes: 0 },
    ]},
    { state: kano, title: "2027 Kano Governorship Election", year: 2027, status: "upcoming" as const, candidates: [
      { name: "Abba Kabir Yusuf", partyId: nnpp.id, runningMate: "Aminu Abdussalam", votes: 0 },
      { name: "Gawuna Nasiru", partyId: apc.id, runningMate: "Ibrahim Aliyu", votes: 0 },
      { name: "Sadiq Aminu Wali", partyId: pdp.id, runningMate: "Garba Musa", votes: 0 },
    ]},
    { state: rivers, title: "2025 Rivers Governorship Election", year: 2025, status: "completed" as const, candidates: [
      { name: "Siminalayi Fubara", partyId: pdp.id, runningMate: "Ngozi Odu", votes: 302614 },
      { name: "Tonye Cole", partyId: apc.id, runningMate: "Ibrahim Kai-Kaung", votes: 95274 },
      ...(aac ? [{ name: "Tonte Ibraye", partyId: aac.id, runningMate: "Grace Ekwem", votes: 22381 }] : []),
      ...(sdp ? [{ name: "Magnus Abe", partyId: sdp.id, runningMate: "Ngozi Peters", votes: 11847 }] : []),
    ]},
    { state: kaduna, title: "2025 Kaduna Governorship Election", year: 2025, status: "completed" as const, candidates: [
      { name: "Uba Sani", partyId: apc.id, runningMate: "Hadiza Balarabe", votes: 719208 },
      { name: "Isa Ashiru", partyId: pdp.id, runningMate: "Sunday Marshall Katung", votes: 446814 },
      ...(nnpp ? [{ name: "Lere Olayinka", partyId: nnpp.id, runningMate: "Bako Aminu", votes: 39527 }] : []),
    ]},
    { state: oyo, title: "2025 Oyo Governorship Election", year: 2025, status: "completed" as const, candidates: [
      { name: "Seyi Makinde", partyId: pdp.id, runningMate: "Bayo Lawal", votes: 562753 },
      { name: "Teslim Folarin", partyId: apc.id, runningMate: "Olamide Balogun", votes: 283827 },
      ...(lp ? [{ name: "Waheed Akanbi", partyId: lp.id, runningMate: "Kayode Olorunfemi", votes: 15394 }] : []),
    ]},
    ...(anambra ? [{ state: anambra, title: "2025 Anambra Governorship Election", year: 2025, status: "completed" as const, candidates: [
      { name: "Charles Soludo", partyId: apga!.id, runningMate: "Onyeka Ibezim", votes: 234071 },
      { name: "Valentine Ozigbo", partyId: pdp.id, runningMate: "Azuka Enemo", votes: 112229 },
      { name: "Andy Uba", partyId: apc.id, runningMate: "Emeka Ibe", votes: 43285 },
      ...(ypp ? [{ name: "Ifeanyi Ubah", partyId: ypp.id, runningMate: "Tony Nwoye", votes: 21261 }] : []),
    ]}] : []),
  ];

  const senatorialElections = [
    { title: "2025 Lagos West Senatorial", year: 2025, status: "completed" as const, stateId: lagos?.id, constituency: "Lagos West", candidates: [
      { name: "Idiat Oluranti Adebule", partyId: apc.id, votes: 389521 },
      { name: "Oladele Olajide", partyId: pdp.id, votes: 125843 },
      ...(lp ? [{ name: "Moshood Salvador", partyId: lp.id, votes: 48721 }] : []),
    ]},
    { title: "2025 Kano Central Senatorial", year: 2025, status: "completed" as const, stateId: kano?.id, constituency: "Kano Central", candidates: [
      { name: "Ibrahim Shekarau", partyId: nnpp.id, votes: 248913 },
      { name: "Abdullahi Ganduje", partyId: apc.id, votes: 201854 },
      { name: "Mahmoud Abbas", partyId: pdp.id, votes: 67421 },
    ]},
  ];

  const fctLgaElections = [
    { lga: findFctLga("AMAC") || findFctLga("MUNICIPAL"), title: "2026 AMAC Chairmanship", year: 2026, status: "ongoing" as const },
    { lga: findFctLga("Bwari"), title: "2026 Bwari Area Council Chairmanship", year: 2026, status: "ongoing" as const },
    { lga: findFctLga("Gwagwalada"), title: "2026 Gwagwalada Area Council Chairmanship", year: 2026, status: "ongoing" as const },
    { lga: findFctLga("Kuje"), title: "2026 Kuje Area Council Chairmanship", year: 2026, status: "ongoing" as const },
    { lga: findFctLga("Kwali"), title: "2026 Kwali Area Council Chairmanship", year: 2026, status: "ongoing" as const },
    { lga: findFctLga("Abaji"), title: "2026 Abaji Area Council Chairmanship", year: 2026, status: "ongoing" as const },
  ];

  let electionsCreated = 0;
  let candidatesCreated = 0;

  const majorParties = [apc, pdp, lp, nnpp].filter(Boolean);
  const lgaCandidateNames = [
    "Mohammed Ibrahim", "Chibueze Okonkwo", "Adebayo Ogunleye", "Ibrahim Danladi",
    "Aisha Yusuf", "Folashade Adeyemi", "Ngozi Eze", "Usman Bello",
    "Obinna Nwosu", "Halima Bello", "Kehinde Adeyemo", "Fatima Sani",
  ];

  async function createElection(config: {
    title: string;
    description?: string;
    electionYear: number;
    electionDate: Date;
    position: "presidential" | "governorship" | "senatorial" | "house_of_reps" | "state_assembly" | "lga_chairman" | "councillorship";
    status: "upcoming" | "ongoing" | "completed" | "cancelled";
    stateId?: string | null;
    lgaId?: string | null;
    constituency?: string;
    candidates: { name: string; partyId: string; runningMate?: string | null; votes: number }[];
  }) {
    const existing = await db.query.generalElections.findFirst({
      where: eq(generalElections.title, config.title),
    });
    if (existing) {
      console.log(`  Skipping existing: ${config.title}`);
      return;
    }

    const totalVotes = config.candidates.reduce((sum, c) => sum + c.votes, 0);
    const [election] = await db.insert(generalElections).values({
      title: config.title,
      description: config.description || `${config.title}`,
      electionYear: config.electionYear,
      electionDate: config.electionDate,
      position: config.position,
      status: config.status,
      stateId: config.stateId || null,
      lgaId: config.lgaId || null,
      constituency: config.constituency || null,
      totalVotesCast: totalVotes,
      totalRegisteredVoters: totalVotes > 0 ? Math.floor(totalVotes * 1.4) : 0,
      totalAccreditedVoters: totalVotes > 0 ? Math.floor(totalVotes * 1.1) : 0,
    }).returning();

    for (const cand of config.candidates) {
      await db.insert(generalElectionCandidates).values({
        electionId: election.id,
        partyId: cand.partyId,
        name: cand.name,
        runningMate: cand.runningMate || null,
        totalVotes: cand.votes,
      });
      candidatesCreated++;
    }
    electionsCreated++;
    console.log(`  Created: ${config.title} with ${config.candidates.length} candidates`);
  }

  for (const el of demoElections) {
    await createElection({
      ...el,
      position: el.position,
      status: el.status,
    });
  }

  for (const el of governorshipElections) {
    if (!el.state) continue;
    await createElection({
      title: el.title,
      electionYear: el.year,
      electionDate: new Date(`${el.year}-03-11`),
      position: "governorship",
      status: el.status,
      stateId: el.state.id,
      candidates: el.candidates.map(c => ({ ...c, runningMate: (c as any).runningMate || null })),
    });
  }

  for (const el of senatorialElections) {
    if (!el.stateId) continue;
    await createElection({
      title: el.title,
      electionYear: el.year,
      electionDate: new Date(`${el.year}-02-25`),
      position: "senatorial",
      status: el.status,
      stateId: el.stateId,
      constituency: el.constituency,
      candidates: el.candidates.map(c => ({ ...c, runningMate: null })),
    });
  }

  for (const el of fctLgaElections) {
    if (!el.lga || !fct) continue;
    const candidatesForLga = majorParties.map((party, i) => ({
      name: lgaCandidateNames[i % lgaCandidateNames.length],
      partyId: party!.id,
      runningMate: null,
      votes: 0,
    }));

    const minorParties = allParties.filter(p => !majorParties.find(mp => mp?.id === p.id)).slice(0, 8);
    for (let i = 0; i < minorParties.length; i++) {
      candidatesForLga.push({
        name: lgaCandidateNames[(i + majorParties.length) % lgaCandidateNames.length],
        partyId: minorParties[i].id,
        runningMate: null,
        votes: 0,
      });
    }

    await createElection({
      title: el.title,
      electionYear: el.year,
      electionDate: new Date(`${el.year}-06-15`),
      position: "lga_chairman",
      status: el.status,
      stateId: fct.id,
      lgaId: el.lga.id,
      candidates: candidatesForLga,
    });
  }

  console.log(`\nElections seeding done! Created ${electionsCreated} elections, ${candidatesCreated} candidates.`);
  return { electionsCreated, candidatesCreated };
}

const isDirectRun = process.argv[1]?.includes("seed-demo-elections");
if (isDirectRun) {
  seedDemoElections()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
