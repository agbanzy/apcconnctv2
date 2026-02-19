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
    SELECT ge.id, ge.title, ge.state_id, ge.total_votes_cast, ge.position
    FROM general_elections ge WHERE ge.status = 'completed'
    ORDER BY ge.total_votes_cast DESC
  `;
  console.log(`Found ${completedElections.length} completed elections`);

  const candidates = await sql`
    SELECT gec.id, gec.election_id, gec.party_id, gec.name, gec.total_votes
    FROM general_election_candidates gec
    JOIN general_elections ge ON ge.id = gec.election_id
    WHERE ge.status = 'completed'
    ORDER BY gec.total_votes DESC
  `;

  const agents = await sql`SELECT pa.id, pa.member_id, pa.polling_unit_id FROM polling_agents pa LIMIT 600`;

  const pusByState = await sql`
    SELECT pu.id as pu_id, s.id as state_id, s.name as state_name
    FROM polling_units pu
    JOIN wards w ON w.id = pu.ward_id
    JOIN lgas l ON l.id = w.lga_id
    JOIN states s ON s.id = l.state_id
  `;
  console.log(`Found ${pusByState.length} polling units across states\n`);

  const stateGroups: Record<string, { state_id: string; state_name: string; pus: string[] }> = {};
  for (const row of pusByState) {
    const sid = row.state_id as string;
    if (!stateGroups[sid]) stateGroups[sid] = { state_id: sid, state_name: row.state_name as string, pus: [] };
    stateGroups[sid].pus.push(row.pu_id as string);
  }
  const allStateIds = Object.keys(stateGroups);
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
        const completedA = new Date(checkedIn.getTime() + Math.random() * 8 * 3600000);
        await sql`UPDATE polling_agents SET election_id = ${election.id}, status = ${status}, checked_in_at = ${checkedIn}, completed_at = ${completedA} WHERE id = ${agent.id}`;
      } else {
        const checkedIn = new Date(Date.now() - Math.random() * 48 * 3600000);
        await sql`UPDATE polling_agents SET election_id = ${election.id}, status = ${status}, checked_in_at = ${checkedIn} WHERE id = ${agent.id}`;
      }
    }
  }
  console.log(`  Linked ${agentIdx} agents`);

  // 2. Create polling_unit_results spread across states
  console.log("\n2. Creating multi-state polling unit results...");
  let totalResults = 0;

  for (const election of completedElections) {
    const electionCandidates = candidates.filter(c => c.election_id === election.id);
    if (electionCandidates.length === 0) continue;

    const totalVotesCast = Number(election.total_votes_cast) || 0;
    const isNational = election.position === 'presidential';
    const electionStateId = election.state_id as string | null;

    let targetStates: string[];
    let pusPerState: number;

    if (isNational) {
      targetStates = allStateIds.slice(0, Math.min(allStateIds.length, 25));
      pusPerState = 3;
    } else if (electionStateId && stateGroups[electionStateId]) {
      targetStates = [electionStateId];
      const neighbors = allStateIds.filter(s => s !== electionStateId).slice(0, 4);
      targetStates.push(...neighbors);
      pusPerState = 10;
    } else {
      targetStates = allStateIds.slice(0, 10);
      pusPerState = 5;
    }

    const totalPUsForElection = targetStates.reduce((sum, sid) => {
      return sum + Math.min(pusPerState, stateGroups[sid]?.pus.length || 0);
    }, 0);
    const votesPerPU = totalPUsForElection > 0 ? Math.floor(totalVotesCast / totalPUsForElection) : 300;

    const electionAgents = await sql`SELECT id, member_id FROM polling_agents WHERE election_id = ${election.id} LIMIT 50`;

    let agentReportIdx = 0;
    for (const stateId of targetStates) {
      const group = stateGroups[stateId];
      if (!group) continue;
      const statePUs = group.pus.slice(0, pusPerState);

      const stateWeight = isNational ? (0.5 + Math.random()) : (0.7 + Math.random() * 0.6);

      for (const puId of statePUs) {
        const puRegistered = Math.floor(300 + Math.random() * 700);
        const puAccredited = Math.floor(puRegistered * (0.6 + Math.random() * 0.3));
        let remainingVotes = Math.min(Math.floor(votesPerPU * stateWeight), puAccredited);

        for (let cIdx = 0; cIdx < electionCandidates.length; cIdx++) {
          const candidate = electionCandidates[cIdx];
          const candidateRatio = totalVotesCast > 0
            ? Number(candidate.total_votes) / totalVotesCast
            : 1 / electionCandidates.length;
          let votes: number;
          if (cIdx === electionCandidates.length - 1) {
            votes = Math.max(0, remainingVotes);
          } else {
            votes = Math.floor(remainingVotes * candidateRatio * (0.7 + Math.random() * 0.6));
            votes = Math.min(votes, remainingVotes);
          }
          remainingVotes -= votes;

          const isVerified = Math.random() > 0.2;
          const reportedBy = electionAgents.length > 0 ? electionAgents[agentReportIdx % electionAgents.length].member_id : null;
          const reportedAt = new Date(Date.now() - Math.random() * 72 * 3600000);

          try {
            await sql`
              INSERT INTO polling_unit_results (id, election_id, polling_unit_id, candidate_id, party_id, votes, registered_voters, accredited_voters, is_verified, reported_by, reported_at)
              VALUES (${randomUUID()}, ${election.id}, ${puId}, ${candidate.id}, ${candidate.party_id}, ${votes}, ${puRegistered}, ${puAccredited}, ${isVerified}, ${reportedBy}, ${reportedAt})
              ON CONFLICT DO NOTHING
            `;
            totalResults++;
          } catch (e) {}
        }
        agentReportIdx++;
      }
    }
    console.log(`  ${election.title}: ${targetStates.length} states, results seeded`);
  }
  console.log(`  Total: ${totalResults} polling unit results`);

  // 3. Create result_sheets
  console.log("\n3. Creating result sheets...");
  let totalSheets = 0;
  const agentsWithElections = await sql`
    SELECT pa.id, pa.member_id, pa.polling_unit_id, pa.election_id
    FROM polling_agents pa
    WHERE pa.election_id IS NOT NULL AND pa.status IN ('checked_in', 'active', 'completed')
    LIMIT 300
  `;

  for (const agent of agentsWithElections) {
    if (Math.random() > 0.5) continue;
    const isVerified = Math.random() > 0.3;
    const uploadedAt = new Date(Date.now() - Math.random() * 48 * 3600000);
    const fileSize = Math.floor(500000 + Math.random() * 2000000);
    const sheetId = randomUUID();

    try {
      await sql`
        INSERT INTO result_sheets (id, polling_unit_id, election_id, uploaded_by, file_url, file_name, mime_type, file_size, is_verified, uploaded_at)
        VALUES (${sheetId}, ${agent.polling_unit_id}, ${agent.election_id}, ${agent.member_id},
          ${`/uploads/result-sheets/${sheetId}.jpg`},
          ${`result_sheet_${(agent.polling_unit_id as string).slice(0, 8)}.jpg`},
          'image/jpeg', ${fileSize}, ${isVerified}, ${uploadedAt})
        ON CONFLICT DO NOTHING
      `;
      totalSheets++;
    } catch (e) {}
  }
  console.log(`  Created ${totalSheets} result sheets`);

  // 4. Create agent_activity_logs
  console.log("\n4. Creating agent activity logs...");
  let totalLogs = 0;
  const actions = ['login', 'check_in', 'submit_results', 'upload_result_sheet', 'submit_results_batch'];

  for (const agent of agentsWithElections) {
    const numActivities = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < numActivities; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
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
  console.log("\n5. Updating ongoing elections with voter data...");
  const ongoingElections = await sql`SELECT id, title FROM general_elections WHERE status = 'ongoing'`;
  for (const election of ongoingElections) {
    const registered = 50000 + Math.floor(Math.random() * 150000);
    const accredited = Math.floor(registered * (0.5 + Math.random() * 0.3));
    const votesCast = Math.floor(accredited * (0.7 + Math.random() * 0.25));
    await sql`UPDATE general_elections SET total_registered_voters = ${registered}, total_accredited_voters = ${accredited}, total_votes_cast = ${votesCast} WHERE id = ${election.id}`;

    const elCandidates = await sql`SELECT id FROM general_election_candidates WHERE election_id = ${election.id}`;
    let remaining = votesCast;
    for (let i = 0; i < elCandidates.length; i++) {
      const votes = i === elCandidates.length - 1 ? remaining : Math.floor(remaining * (0.2 + Math.random() * 0.4));
      remaining -= votes;
      await sql`UPDATE general_election_candidates SET total_votes = ${votes} WHERE id = ${elCandidates[i].id}`;
    }
  }
  console.log(`  Updated ${ongoingElections.length} ongoing elections`);

  // Final verification
  console.log("\n=== Final Verification ===");
  const counts = await sql`
    SELECT 
      (SELECT COUNT(*) FROM polling_agents WHERE election_id IS NOT NULL) as linked_agents,
      (SELECT COUNT(*) FROM polling_agents WHERE status IN ('checked_in', 'active')) as active_agents,
      (SELECT COUNT(*) FROM polling_unit_results) as results,
      (SELECT COUNT(DISTINCT polling_unit_id) FROM polling_unit_results) as distinct_pus,
      (SELECT COUNT(*) FROM result_sheets) as sheets,
      (SELECT COUNT(*) FROM agent_activity_logs) as activity_logs,
      (SELECT COUNT(*) FROM agent_activity_logs WHERE created_at > NOW() - INTERVAL '24 hours') as recent_activity
  `;
  console.log(JSON.stringify(counts[0], null, 2));

  const stateSpread = await sql`
    SELECT s.name, COUNT(DISTINCT pur.polling_unit_id) as pus, SUM(pur.votes) as total_votes
    FROM polling_unit_results pur
    JOIN polling_units pu ON pu.id = pur.polling_unit_id
    JOIN wards w ON w.id = pu.ward_id
    JOIN lgas l ON l.id = w.lga_id
    JOIN states s ON s.id = l.state_id
    WHERE pur.election_id = (SELECT id FROM general_elections WHERE position = 'presidential' AND status = 'completed' LIMIT 1)
    GROUP BY s.name ORDER BY total_votes DESC
  `;
  console.log(`\nPresidential election results spread across ${stateSpread.length} states:`);
  for (const s of stateSpread) {
    console.log(`  ${s.name}: ${s.pus} PUs, ${Number(s.total_votes).toLocaleString()} votes`);
  }

  console.log("\nDone!");
}

seedElectionAnalytics().catch(console.error);
