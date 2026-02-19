import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

async function seedElectionAnalytics() {
  console.log("=== Seeding Election Analytics Data ===\n");

  console.log("Step 0: Clearing old analytics data...");
  await sql`DELETE FROM agent_activity_logs`;
  await sql`DELETE FROM result_sheets`;
  await sql`DELETE FROM polling_unit_results`;
  await sql`UPDATE polling_agents SET election_id = NULL, status = 'assigned', checked_in_at = NULL, completed_at = NULL`;
  console.log("  Cleared.\n");

  const completedElections = await sql`
    SELECT ge.id, ge.title, ge.state_id, ge.lga_id, ge.total_votes_cast, ge.position
    FROM general_elections ge WHERE ge.status = 'completed'
    ORDER BY ge.total_votes_cast DESC
  `;
  console.log(`Found ${completedElections.length} completed elections`);

  const allCandidates = await sql`
    SELECT gec.id, gec.election_id, gec.party_id, gec.name, gec.total_votes
    FROM general_election_candidates gec
    JOIN general_elections ge ON ge.id = gec.election_id
    ORDER BY gec.total_votes DESC
  `;

  const agents = await sql`SELECT pa.id, pa.member_id, pa.polling_unit_id FROM polling_agents pa`;
  console.log(`Found ${agents.length} total polling agents`);

  const puRows = await sql`
    SELECT pu.id as pu_id, w.lga_id, l.state_id, s.name as state_name, l.name as lga_name
    FROM polling_units pu
    JOIN wards w ON w.id = pu.ward_id
    JOIN lgas l ON l.id = w.lga_id
    JOIN states s ON s.id = l.state_id
  `;
  console.log(`Found ${puRows.length} polling units with geography\n`);

  const pusByState: Record<string, string[]> = {};
  const pusByLga: Record<string, string[]> = {};
  const stateNames: Record<string, string> = {};
  const lgaNames: Record<string, string> = {};
  for (const row of puRows) {
    const sid = row.state_id as string;
    const lid = row.lga_id as string;
    if (!pusByState[sid]) pusByState[sid] = [];
    pusByState[sid].push(row.pu_id as string);
    if (!pusByLga[lid]) pusByLga[lid] = [];
    pusByLga[lid].push(row.pu_id as string);
    stateNames[sid] = row.state_name as string;
    lgaNames[lid] = row.lga_name as string;
  }

  const allStateIds = Object.keys(pusByState);
  console.log(`Polling units spread across ${allStateIds.length} states`);

  // 1. Link agents to elections
  console.log("\n1. Linking agents to elections...");
  const agentsPerElection = Math.floor(agents.length / completedElections.length);
  let agentIdx = 0;
  const statuses = ['checked_in', 'checked_in', 'checked_in', 'active', 'active', 'completed', 'completed', 'completed', 'completed', 'assigned'];

  for (const election of completedElections) {
    const count = Math.min(agentsPerElection, agents.length - agentIdx);
    if (count <= 0) break;
    for (let i = 0; i < count && agentIdx < agents.length; i++, agentIdx++) {
      const agent = agents[agentIdx];
      const status = statuses[i % statuses.length];
      if (status === 'assigned') {
        await sql`UPDATE polling_agents SET election_id = ${election.id}, status = ${status} WHERE id = ${agent.id}`;
      } else if (status === 'completed') {
        const checkedIn = new Date(Date.now() - Math.random() * 48 * 3600000);
        const done = new Date(checkedIn.getTime() + Math.random() * 8 * 3600000);
        await sql`UPDATE polling_agents SET election_id = ${election.id}, status = ${status}, checked_in_at = ${checkedIn}, completed_at = ${done} WHERE id = ${agent.id}`;
      } else {
        const checkedIn = new Date(Date.now() - Math.random() * 48 * 3600000);
        await sql`UPDATE polling_agents SET election_id = ${election.id}, status = ${status}, checked_in_at = ${checkedIn} WHERE id = ${agent.id}`;
      }
    }
  }
  console.log(`  Linked ${agentIdx} agents`);

  // 2. Create polling_unit_results - properly scoped by election geography
  console.log("\n2. Creating geographically-accurate polling unit results...");
  let totalResults = 0;

  for (const election of completedElections) {
    const elCandidates = allCandidates.filter(c => c.election_id === election.id);
    if (elCandidates.length === 0) continue;

    const totalVotesCast = Number(election.total_votes_cast) || 0;
    const position = election.position as string;
    const elStateId = election.state_id as string | null;
    const elLgaId = election.lga_id as string | null;

    let targetPUs: string[] = [];
    let scopeLabel = "";

    if (position === 'presidential') {
      for (const sid of allStateIds) {
        const statePUs = pusByState[sid];
        const sample = statePUs.slice(0, Math.min(3, statePUs.length));
        targetPUs.push(...sample);
      }
      scopeLabel = `all ${allStateIds.length} states`;
    } else if (position === 'lga_chairman' || position === 'councillorship') {
      if (elLgaId && pusByLga[elLgaId]) {
        targetPUs = pusByLga[elLgaId].slice(0, Math.min(15, pusByLga[elLgaId].length));
        scopeLabel = `LGA: ${lgaNames[elLgaId] || elLgaId}`;
      } else if (elStateId && pusByState[elStateId]) {
        targetPUs = pusByState[elStateId].slice(0, 15);
        scopeLabel = `State fallback: ${stateNames[elStateId]}`;
      }
    } else {
      if (elStateId && pusByState[elStateId]) {
        targetPUs = pusByState[elStateId].slice(0, Math.min(30, pusByState[elStateId].length));
        scopeLabel = `State: ${stateNames[elStateId]}`;
      }
    }

    if (targetPUs.length === 0) {
      console.log(`  SKIP ${election.title}: No PUs available for scope`);
      continue;
    }

    const votesPerPU = totalVotesCast > 0 ? Math.floor(totalVotesCast / targetPUs.length) : 300;
    const elAgents = await sql`SELECT id, member_id FROM polling_agents WHERE election_id = ${election.id} LIMIT 50`;
    let aIdx = 0;

    for (const puId of targetPUs) {
      const puReg = Math.floor(300 + Math.random() * 700);
      const puAcc = Math.floor(puReg * (0.6 + Math.random() * 0.3));
      const variation = 0.6 + Math.random() * 0.8;
      let remaining = Math.min(Math.floor(votesPerPU * variation), puAcc);

      for (let ci = 0; ci < elCandidates.length; ci++) {
        const cand = elCandidates[ci];
        const ratio = totalVotesCast > 0 ? Number(cand.total_votes) / totalVotesCast : 1 / elCandidates.length;
        let votes: number;
        if (ci === elCandidates.length - 1) {
          votes = Math.max(0, remaining);
        } else {
          votes = Math.floor(remaining * ratio * (0.7 + Math.random() * 0.6));
          votes = Math.min(votes, remaining);
        }
        remaining -= votes;

        const verified = Math.random() > 0.2;
        const reporter = elAgents.length > 0 ? elAgents[aIdx % elAgents.length].member_id : null;
        const reportedAt = new Date(Date.now() - Math.random() * 72 * 3600000);

        try {
          await sql`
            INSERT INTO polling_unit_results (id, election_id, polling_unit_id, candidate_id, party_id, votes, registered_voters, accredited_voters, is_verified, reported_by, reported_at)
            VALUES (${randomUUID()}, ${election.id}, ${puId}, ${cand.id}, ${cand.party_id}, ${votes}, ${puReg}, ${puAcc}, ${verified}, ${reporter}, ${reportedAt})
            ON CONFLICT DO NOTHING
          `;
          totalResults++;
        } catch (e) {}
      }
      aIdx++;
    }
    console.log(`  ${election.title} -> ${targetPUs.length} PUs (${scopeLabel})`);
  }
  console.log(`  Total: ${totalResults} polling unit results`);

  // 3. Create result_sheets
  console.log("\n3. Creating result sheets...");
  let totalSheets = 0;
  const linkedAgents = await sql`
    SELECT pa.id, pa.member_id, pa.polling_unit_id, pa.election_id
    FROM polling_agents pa
    WHERE pa.election_id IS NOT NULL AND pa.status IN ('checked_in', 'active', 'completed')
    LIMIT 300
  `;
  for (const agent of linkedAgents) {
    if (Math.random() > 0.5) continue;
    const verified = Math.random() > 0.3;
    const uploadedAt = new Date(Date.now() - Math.random() * 48 * 3600000);
    const sheetId = randomUUID();
    try {
      await sql`
        INSERT INTO result_sheets (id, polling_unit_id, election_id, uploaded_by, file_url, file_name, mime_type, file_size, is_verified, uploaded_at)
        VALUES (${sheetId}, ${agent.polling_unit_id}, ${agent.election_id}, ${agent.member_id},
          ${`/uploads/result-sheets/${sheetId}.jpg`},
          ${`result_sheet_${(agent.polling_unit_id as string).slice(0, 8)}.jpg`},
          'image/jpeg', ${Math.floor(500000 + Math.random() * 2000000)}, ${verified}, ${uploadedAt})
        ON CONFLICT DO NOTHING
      `;
      totalSheets++;
    } catch (e) {}
  }
  console.log(`  Created ${totalSheets} result sheets`);

  // 4. Create agent_activity_logs
  console.log("\n4. Creating agent activity logs...");
  let totalLogs = 0;
  const actionTypes = ['login', 'check_in', 'submit_results', 'upload_result_sheet', 'submit_results_batch'];
  for (const agent of linkedAgents) {
    const n = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const createdAt = new Date(Date.now() - Math.random() * 72 * 3600000);
      let metadata: any = {};
      if (action === 'submit_results' || action === 'submit_results_batch') {
        metadata = { resultsCount: 1 + Math.floor(Math.random() * 5), electionsSubmitted: 1 };
      } else if (action === 'upload_result_sheet') {
        metadata = { fileName: `sheet_${randomUUID().slice(0, 8)}.jpg`, fileSize: Math.floor(500000 + Math.random() * 2000000) };
      } else {
        metadata = { deviceInfo: 'Android 13 / Chrome Mobile', ip: `102.89.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` };
      }
      try {
        await sql`
          INSERT INTO agent_activity_logs (id, agent_id, member_id, polling_unit_id, election_id, action, metadata, created_at)
          VALUES (${randomUUID()}, ${agent.id}, ${agent.member_id}, ${agent.polling_unit_id}, ${agent.election_id}, ${action}, ${JSON.stringify(metadata)}::jsonb, ${createdAt})
        `;
        totalLogs++;
      } catch (e) {}
    }
  }
  console.log(`  Created ${totalLogs} activity logs`);

  // 5. Update ongoing elections
  console.log("\n5. Updating ongoing elections...");
  const ongoingElections = await sql`SELECT id, title FROM general_elections WHERE status = 'ongoing'`;
  for (const el of ongoingElections) {
    const reg = 50000 + Math.floor(Math.random() * 150000);
    const acc = Math.floor(reg * (0.5 + Math.random() * 0.3));
    const votes = Math.floor(acc * (0.7 + Math.random() * 0.25));
    await sql`UPDATE general_elections SET total_registered_voters = ${reg}, total_accredited_voters = ${acc}, total_votes_cast = ${votes} WHERE id = ${el.id}`;
    const cands = await sql`SELECT id FROM general_election_candidates WHERE election_id = ${el.id}`;
    let rem = votes;
    for (let i = 0; i < cands.length; i++) {
      const v = i === cands.length - 1 ? rem : Math.floor(rem * (0.2 + Math.random() * 0.4));
      rem -= v;
      await sql`UPDATE general_election_candidates SET total_votes = ${v} WHERE id = ${cands[i].id}`;
    }
  }
  console.log(`  Updated ${ongoingElections.length} ongoing elections`);

  // Verification
  console.log("\n=== Verification ===");
  const counts = await sql`
    SELECT 
      (SELECT COUNT(*) FROM polling_agents WHERE election_id IS NOT NULL) as linked_agents,
      (SELECT COUNT(*) FROM polling_agents WHERE status IN ('checked_in', 'active')) as active_agents,
      (SELECT COUNT(*) FROM polling_unit_results) as results,
      (SELECT COUNT(DISTINCT polling_unit_id) FROM polling_unit_results) as distinct_pus,
      (SELECT COUNT(*) FROM result_sheets) as sheets,
      (SELECT COUNT(*) FROM agent_activity_logs) as logs,
      (SELECT COUNT(*) FROM agent_activity_logs WHERE created_at > NOW() - INTERVAL '24 hours') as recent
  `;
  console.log(JSON.stringify(counts[0], null, 2));

  console.log("\nPresidential election state spread:");
  const presSpread = await sql`
    SELECT s.name, COUNT(DISTINCT pur.polling_unit_id) as pus, SUM(pur.votes)::int as votes
    FROM polling_unit_results pur
    JOIN polling_units pu ON pu.id = pur.polling_unit_id
    JOIN wards w ON w.id = pu.ward_id
    JOIN lgas l ON l.id = w.lga_id
    JOIN states s ON s.id = l.state_id
    WHERE pur.election_id = (SELECT id FROM general_elections WHERE position = 'presidential' AND status = 'completed' LIMIT 1)
    GROUP BY s.name ORDER BY votes DESC
  `;
  for (const r of presSpread) console.log(`  ${r.name}: ${r.pus} PUs, ${Number(r.votes).toLocaleString()} votes`);

  console.log("\nGovernership election geographic accuracy:");
  const govCheck = await sql`
    SELECT ge.title, s.name as election_state,
      (SELECT STRING_AGG(DISTINCT s2.name, ', ')
       FROM polling_unit_results pur2
       JOIN polling_units pu2 ON pu2.id = pur2.polling_unit_id
       JOIN wards w2 ON w2.id = pu2.ward_id
       JOIN lgas l2 ON l2.id = w2.lga_id
       JOIN states s2 ON s2.id = l2.state_id
       WHERE pur2.election_id = ge.id) as result_states
    FROM general_elections ge
    LEFT JOIN states s ON s.id = ge.state_id
    WHERE ge.status = 'completed' AND ge.position IN ('governorship', 'senatorial')
  `;
  for (const r of govCheck) console.log(`  ${r.title} (${r.election_state}) -> Results in: ${r.result_states}`);

  console.log("\nLGA Chairman election geographic accuracy:");
  const lgaCheck = await sql`
    SELECT ge.title, l.name as election_lga,
      (SELECT STRING_AGG(DISTINCT l2.name, ', ')
       FROM polling_unit_results pur2
       JOIN polling_units pu2 ON pu2.id = pur2.polling_unit_id
       JOIN wards w2 ON w2.id = pu2.ward_id
       JOIN lgas l2 ON l2.id = w2.lga_id
       WHERE pur2.election_id = ge.id) as result_lgas
    FROM general_elections ge
    LEFT JOIN lgas l ON l.id = ge.lga_id
    WHERE ge.status = 'ongoing' AND ge.position = 'lga_chairman'
  `;
  for (const r of lgaCheck) console.log(`  ${r.title} (${r.election_lga}) -> Results in: ${r.result_lgas || 'none yet'}`);

  console.log("\nDone!");
}

seedElectionAnalytics().catch(console.error);
