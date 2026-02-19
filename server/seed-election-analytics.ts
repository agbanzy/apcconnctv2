import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

async function seedElectionAnalytics() {
  console.log("Seeding election analytics data...");

  const completedElections = await sql`
    SELECT ge.id, ge.title, ge.state_id, ge.total_votes_cast, ge.position
    FROM general_elections ge
    WHERE ge.status = 'completed'
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
  console.log(`Found ${candidates.length} candidates for completed elections`);

  const agents = await sql`
    SELECT pa.id, pa.member_id, pa.polling_unit_id
    FROM polling_agents pa
    LIMIT 500
  `;
  console.log(`Found ${agents.length} polling agents`);

  const pollingUnits = await sql`
    SELECT pu.id, pu.ward_id, w.lga_id, l.state_id
    FROM polling_units pu
    JOIN wards w ON w.id = pu.ward_id
    JOIN lgas l ON l.id = w.lga_id
    LIMIT 1000
  `;
  console.log(`Found ${pollingUnits.length} polling units with state info`);

  const pusByState: Record<string, typeof pollingUnits> = {};
  for (const pu of pollingUnits) {
    const sid = pu.state_id as string;
    if (!pusByState[sid]) pusByState[sid] = [];
    pusByState[sid].push(pu);
  }

  const allStates = await sql`SELECT id, name FROM states`;
  const stateMap = new Map(allStates.map(s => [s.id as string, s.name as string]));

  // 1. Link agents to completed elections and set status
  console.log("\n1. Linking agents to elections...");
  const agentsPerElection = Math.floor(agents.length / completedElections.length);
  let agentIdx = 0;
  for (const election of completedElections) {
    const count = Math.min(agentsPerElection, agents.length - agentIdx);
    if (count <= 0) break;

    const statusDistribution = ['checked_in', 'checked_in', 'checked_in', 'active', 'active', 'completed', 'completed', 'completed', 'completed', 'assigned'];

    for (let i = 0; i < count && agentIdx < agents.length; i++, agentIdx++) {
      const agent = agents[agentIdx];
      const status = statusDistribution[i % statusDistribution.length];

      if (status === 'assigned') {
        await sql`
          UPDATE polling_agents
          SET election_id = ${election.id}, status = ${status}
          WHERE id = ${agent.id}
        `;
      } else if (status === 'completed') {
        const checkedInAt = new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000);
        const completedAt = new Date(checkedInAt.getTime() + Math.random() * 8 * 60 * 60 * 1000);
        await sql`
          UPDATE polling_agents
          SET election_id = ${election.id}, status = ${status},
              checked_in_at = ${checkedInAt}, completed_at = ${completedAt}
          WHERE id = ${agent.id}
        `;
      } else {
        const checkedInAt = new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000);
        await sql`
          UPDATE polling_agents
          SET election_id = ${election.id}, status = ${status},
              checked_in_at = ${checkedInAt}
          WHERE id = ${agent.id}
        `;
      }
    }
  }
  console.log(`  Linked ${agentIdx} agents to ${completedElections.length} elections`);

  // 2. Create polling_unit_results for completed elections
  console.log("\n2. Creating polling unit results...");
  let totalResults = 0;

  for (const election of completedElections) {
    const electionCandidates = candidates.filter(c => c.election_id === election.id);
    if (electionCandidates.length === 0) continue;

    const electionStateId = election.state_id as string | null;
    let targetPUs: typeof pollingUnits;

    if (electionStateId && pusByState[electionStateId]) {
      targetPUs = pusByState[electionStateId].slice(0, 50);
    } else {
      targetPUs = pollingUnits.slice(0, 80);
    }

    if (targetPUs.length === 0) continue;

    const totalVotesCast = Number(election.total_votes_cast) || 0;
    const votesPerPU = Math.floor(totalVotesCast / targetPUs.length);

    const electionAgents = await sql`
      SELECT id, member_id FROM polling_agents WHERE election_id = ${election.id} LIMIT 50
    `;

    for (let puIdx = 0; puIdx < targetPUs.length; puIdx++) {
      const pu = targetPUs[puIdx];
      const puRegistered = Math.floor(300 + Math.random() * 700);
      const puAccredited = Math.floor(puRegistered * (0.6 + Math.random() * 0.3));

      let remainingVotes = Math.min(votesPerPU, puAccredited);

      for (let cIdx = 0; cIdx < electionCandidates.length; cIdx++) {
        const candidate = electionCandidates[cIdx];
        const candidateTotalVotes = Number(candidate.total_votes) || 0;
        const candidateRatio = totalVotesCast > 0 ? candidateTotalVotes / totalVotesCast : 1 / electionCandidates.length;
        let votes: number;

        if (cIdx === electionCandidates.length - 1) {
          votes = Math.max(0, remainingVotes);
        } else {
          votes = Math.floor(remainingVotes * candidateRatio * (0.8 + Math.random() * 0.4));
          votes = Math.min(votes, remainingVotes);
        }
        remainingVotes -= votes;

        const isVerified = Math.random() > 0.2;
        const reportedBy = electionAgents.length > 0 ? electionAgents[puIdx % electionAgents.length].member_id : null;
        const reportedAt = new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000);
        const resultId = randomUUID();

        try {
          await sql`
            INSERT INTO polling_unit_results (id, election_id, polling_unit_id, candidate_id, party_id, votes, registered_voters, accredited_voters, is_verified, reported_by, reported_at)
            VALUES (${resultId}, ${election.id}, ${pu.id}, ${candidate.id}, ${candidate.party_id}, ${votes}, ${puRegistered}, ${puAccredited}, ${isVerified}, ${reportedBy}, ${reportedAt})
            ON CONFLICT DO NOTHING
          `;
          totalResults++;
        } catch (e: any) {
          // skip duplicates
        }
      }
    }
  }
  console.log(`  Created ${totalResults} polling unit results`);

  // 3. Create result_sheets
  console.log("\n3. Creating result sheets...");
  let totalSheets = 0;

  const agentsWithElections = await sql`
    SELECT pa.id, pa.member_id, pa.polling_unit_id, pa.election_id
    FROM polling_agents pa
    WHERE pa.election_id IS NOT NULL AND pa.status IN ('checked_in', 'active', 'completed')
    LIMIT 200
  `;

  for (const agent of agentsWithElections) {
    if (Math.random() > 0.6) continue;

    const sheetId = randomUUID();
    const isVerified = Math.random() > 0.35;
    const uploadedAt = new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000);
    const fileSize = Math.floor(500000 + Math.random() * 2000000);

    try {
      await sql`
        INSERT INTO result_sheets (id, polling_unit_id, election_id, uploaded_by, file_url, file_name, mime_type, file_size, is_verified, uploaded_at)
        VALUES (${sheetId}, ${agent.polling_unit_id}, ${agent.election_id}, ${agent.member_id},
          ${`/uploads/result-sheets/${sheetId}.jpg`},
          ${`result_sheet_${agent.polling_unit_id?.toString().slice(0, 8)}.jpg`},
          'image/jpeg', ${fileSize}, ${isVerified}, ${uploadedAt})
        ON CONFLICT DO NOTHING
      `;
      totalSheets++;
    } catch (e: any) {
      // skip
    }
  }
  console.log(`  Created ${totalSheets} result sheets`);

  // 4. Create agent_activity_logs
  console.log("\n4. Creating agent activity logs...");
  let totalLogs = 0;
  const actions = ['login', 'check_in', 'submit_results', 'upload_result_sheet', 'submit_results_batch'];

  for (const agent of agentsWithElections) {
    const numActivities = 2 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numActivities; i++) {
      const logId = randomUUID();
      const action = actions[Math.floor(Math.random() * actions.length)];
      const createdAt = new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000);

      let metadata: any = {};
      if (action === 'submit_results' || action === 'submit_results_batch') {
        metadata = { resultsCount: 1 + Math.floor(Math.random() * 5), electionsSubmitted: 1 };
      } else if (action === 'upload_result_sheet') {
        metadata = { fileName: `sheet_${logId.slice(0, 8)}.jpg`, fileSize: Math.floor(500000 + Math.random() * 2000000) };
      } else if (action === 'login' || action === 'check_in') {
        metadata = { deviceInfo: 'Android 13 / Chrome Mobile', ip: `102.89.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` };
      }

      try {
        await sql`
          INSERT INTO agent_activity_logs (id, agent_id, member_id, polling_unit_id, election_id, action, metadata, created_at)
          VALUES (${logId}, ${agent.id}, ${agent.member_id}, ${agent.polling_unit_id}, ${agent.election_id}, ${action}, ${JSON.stringify(metadata)}::jsonb, ${createdAt})
        `;
        totalLogs++;
      } catch (e: any) {
        // skip
      }
    }
  }
  console.log(`  Created ${totalLogs} agent activity logs`);

  // 5. Update ongoing elections with some vote data too
  console.log("\n5. Updating ongoing elections with realistic voter data...");
  const ongoingElections = await sql`
    SELECT id, title FROM general_elections WHERE status = 'ongoing'
  `;

  for (const election of ongoingElections) {
    const registered = 50000 + Math.floor(Math.random() * 150000);
    const accredited = Math.floor(registered * (0.5 + Math.random() * 0.3));
    const votesCast = Math.floor(accredited * (0.7 + Math.random() * 0.25));

    await sql`
      UPDATE general_elections
      SET total_registered_voters = ${registered},
          total_accredited_voters = ${accredited},
          total_votes_cast = ${votesCast}
      WHERE id = ${election.id}
    `;

    const elCandidates = await sql`
      SELECT id FROM general_election_candidates WHERE election_id = ${election.id}
    `;

    let remaining = votesCast;
    for (let i = 0; i < elCandidates.length; i++) {
      const c = elCandidates[i];
      let votes: number;
      if (i === elCandidates.length - 1) {
        votes = remaining;
      } else {
        votes = Math.floor(remaining * (0.2 + Math.random() * 0.4));
        remaining -= votes;
      }
      await sql`UPDATE general_election_candidates SET total_votes = ${votes} WHERE id = ${c.id}`;
    }
  }
  console.log(`  Updated ${ongoingElections.length} ongoing elections`);

  // Final verification
  console.log("\n--- Final Counts ---");
  const counts = await sql`
    SELECT 
      (SELECT COUNT(*) FROM polling_agents WHERE election_id IS NOT NULL) as linked_agents,
      (SELECT COUNT(*) FROM polling_agents WHERE status IN ('checked_in', 'active')) as active_agents,
      (SELECT COUNT(*) FROM polling_unit_results) as results,
      (SELECT COUNT(*) FROM result_sheets) as sheets,
      (SELECT COUNT(*) FROM agent_activity_logs) as activity_logs,
      (SELECT COUNT(*) FROM agent_activity_logs WHERE created_at > NOW() - INTERVAL '24 hours') as recent_activity
  `;
  console.log(JSON.stringify(counts[0], null, 2));
  console.log("\nDone!");
}

seedElectionAnalytics().catch(console.error);
