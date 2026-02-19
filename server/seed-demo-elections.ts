import { db } from "./db";
import { generalElections, generalElectionCandidates, parties, states } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function seedDemoElections() {
  console.log("Seeding demo election data...");

  const allParties = await db.query.parties.findMany();
  const allStates = await db.query.states.findMany();

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
    console.error("Required parties not found");
    return;
  }

  const lagos = allStates.find(s => s.name === "Lagos");
  const kano = allStates.find(s => s.name === "Kano");
  const rivers = allStates.find(s => s.name === "Rivers");
  const kaduna = allStates.find(s => s.name === "Kaduna");
  const oyo = allStates.find(s => s.name === "Oyo");
  const anambra = allStates.find(s => s.name === "Anambra");
  const enugu = allStates.find(s => s.name === "Enugu");
  const delta = allStates.find(s => s.name === "Delta");
  const imo = allStates.find(s => s.name === "Imo");
  const abia = allStates.find(s => s.name === "Abia");
  const borno = allStates.find(s => s.name === "Borno");
  const sokoto = allStates.find(s => s.name === "Sokoto");

  const demoElections = [
    {
      title: "2027 Presidential Election",
      description: "General election for the President of the Federal Republic of Nigeria",
      electionYear: 2027,
      electionDate: new Date("2027-02-25"),
      position: "presidential" as const,
      status: "upcoming" as const,
      stateId: null,
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

  let createdCount = 0;

  for (const el of demoElections) {
    const existing = await db.query.generalElections.findFirst({
      where: eq(generalElections.title, el.title),
    });
    if (existing) {
      console.log(`  Skipping existing: ${el.title}`);
      continue;
    }

    const [election] = await db.insert(generalElections).values({
      title: el.title,
      description: el.description,
      electionYear: el.electionYear,
      electionDate: el.electionDate,
      position: el.position,
      status: el.status,
      totalVotesCast: el.candidates.reduce((sum, c) => sum + c.votes, 0),
      totalRegisteredVoters: Math.floor(el.candidates.reduce((sum, c) => sum + c.votes, 0) * 1.4),
      totalAccreditedVoters: Math.floor(el.candidates.reduce((sum, c) => sum + c.votes, 0) * 1.1),
    }).returning();

    for (const cand of el.candidates) {
      await db.insert(generalElectionCandidates).values({
        electionId: election.id,
        partyId: cand.partyId,
        name: cand.name,
        runningMate: cand.runningMate || null,
        totalVotes: cand.votes,
      });
    }
    createdCount++;
    console.log(`  Created: ${el.title} with ${el.candidates.length} candidates`);
  }

  for (const el of governorshipElections) {
    if (!el.state) continue;
    const existing = await db.query.generalElections.findFirst({
      where: eq(generalElections.title, el.title),
    });
    if (existing) {
      console.log(`  Skipping existing: ${el.title}`);
      continue;
    }

    const totalVotes = el.candidates.reduce((sum, c) => sum + c.votes, 0);
    const [election] = await db.insert(generalElections).values({
      title: el.title,
      electionYear: el.year,
      electionDate: new Date(`${el.year}-03-11`),
      position: "governorship",
      status: el.status,
      stateId: el.state.id,
      totalVotesCast: totalVotes,
      totalRegisteredVoters: totalVotes > 0 ? Math.floor(totalVotes * 1.4) : 0,
      totalAccreditedVoters: totalVotes > 0 ? Math.floor(totalVotes * 1.1) : 0,
    }).returning();

    for (const cand of el.candidates) {
      await db.insert(generalElectionCandidates).values({
        electionId: election.id,
        partyId: cand.partyId,
        name: cand.name,
        runningMate: (cand as any).runningMate || null,
        totalVotes: cand.votes,
      });
    }
    createdCount++;
    console.log(`  Created: ${el.title} with ${el.candidates.length} candidates`);
  }

  for (const el of senatorialElections) {
    if (!el.stateId) continue;
    const existing = await db.query.generalElections.findFirst({
      where: eq(generalElections.title, el.title),
    });
    if (existing) {
      console.log(`  Skipping existing: ${el.title}`);
      continue;
    }

    const totalVotes = el.candidates.reduce((sum, c) => sum + c.votes, 0);
    const [election] = await db.insert(generalElections).values({
      title: el.title,
      electionYear: el.year,
      electionDate: new Date(`${el.year}-02-25`),
      position: "senatorial",
      status: el.status,
      stateId: el.stateId,
      constituency: el.constituency,
      totalVotesCast: totalVotes,
      totalRegisteredVoters: Math.floor(totalVotes * 1.35),
      totalAccreditedVoters: Math.floor(totalVotes * 1.05),
    }).returning();

    for (const cand of el.candidates) {
      await db.insert(generalElectionCandidates).values({
        electionId: election.id,
        partyId: cand.partyId,
        name: cand.name,
        totalVotes: cand.votes,
      });
    }
    createdCount++;
    console.log(`  Created: ${el.title} with ${el.candidates.length} candidates`);
  }

  for (const existingEl of await db.query.generalElections.findMany({
    where: eq(generalElections.position, "lga_chairman"),
    with: { candidates: true },
  })) {
    if (existingEl.candidates && existingEl.candidates.length > 0) continue;
    
    const majorParties = [apc, pdp, lp, nnpp].filter(Boolean);
    const candidateNames = [
      ["Mohammed Ibrahim", "Usman Bello"],
      ["Chibueze Okonkwo", "Ngozi Eze"],
      ["Adebayo Ogunleye", "Folashade Adeyemi"],
      ["Ibrahim Danladi", "Aisha Yusuf"],
    ];

    for (let i = 0; i < majorParties.length; i++) {
      const party = majorParties[i]!;
      const names = candidateNames[i] || candidateNames[0];
      const votes = existingEl.status === "completed" ? Math.floor(Math.random() * 50000) + 5000 : 0;
      await db.insert(generalElectionCandidates).values({
        electionId: existingEl.id,
        partyId: party.id,
        name: names[0],
        totalVotes: votes,
      });
    }
    
    const totalVotes = existingEl.status === "completed" 
      ? (await db.query.generalElectionCandidates.findMany({ where: eq(generalElectionCandidates.electionId, existingEl.id) }))
          .reduce((sum, c) => sum + (c.totalVotes || 0), 0)
      : 0;
    
    if (totalVotes > 0) {
      await db.update(generalElections)
        .set({ 
          totalVotesCast: totalVotes,
          totalRegisteredVoters: Math.floor(totalVotes * 1.4),
          totalAccreditedVoters: Math.floor(totalVotes * 1.1),
        })
        .where(eq(generalElections.id, existingEl.id));
    }
    
    console.log(`  Added candidates to existing: ${existingEl.title}`);
  }

  console.log(`\nDone! Created ${createdCount} new elections.`);

  const totalElections = await db.query.generalElections.findMany();
  const totalCandidates = await db.query.generalElectionCandidates.findMany();
  console.log(`Total elections: ${totalElections.length}, Total candidates: ${totalCandidates.length}`);
}

seedDemoElections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
