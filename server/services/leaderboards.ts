import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  points: number;
  stateName?: string;
  wardName?: string;
}

export class LeaderboardService {
  async getNationalLeaderboard(limit = 100, offset = 0): Promise<{
    leaderboard: LeaderboardEntry[];
    total: number;
  }> {
    const leaderboardQuery = sql`
      WITH member_points AS (
        SELECT 
          up.member_id,
          COALESCE(MAX(up.balance_after), 0) as total_points
        FROM ${schema.userPoints} up
        GROUP BY up.member_id
      ),
      ranked_members AS (
        SELECT 
          m.id as member_id,
          u.first_name || ' ' || u.last_name as member_name,
          COALESCE(mp.total_points, 0) as points,
          s.name as state_name,
          w.name as ward_name,
          ROW_NUMBER() OVER (ORDER BY COALESCE(mp.total_points, 0) DESC, m.created_at ASC) as rank
        FROM ${schema.members} m
        INNER JOIN ${schema.users} u ON m.user_id = u.id
        LEFT JOIN member_points mp ON m.id = mp.member_id
        LEFT JOIN ${schema.wards} w ON m.ward_id = w.id
        LEFT JOIN ${schema.lgas} l ON w.lga_id = l.id
        LEFT JOIN ${schema.states} s ON l.state_id = s.id
        WHERE m.status = 'active'
      )
      SELECT * FROM ranked_members
      ORDER BY rank ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const leaderboard = await db.execute(leaderboardQuery);

    const countQuery = sql`
      SELECT COUNT(DISTINCT m.id)::int as total
      FROM ${schema.members} m
      WHERE m.status = 'active'
    `;

    const countResult = await db.execute(countQuery);
    const total = (countResult.rows[0] as any)?.total || 0;

    return {
      leaderboard: leaderboard.rows.map((row: any) => ({
        rank: Number(row.rank),
        memberId: row.member_id,
        memberName: row.member_name,
        points: Number(row.points),
        stateName: row.state_name,
        wardName: row.ward_name,
      })),
      total,
    };
  }

  async getStateLeaderboard(
    stateId: string,
    limit = 100,
    offset = 0
  ): Promise<{
    leaderboard: LeaderboardEntry[];
    total: number;
    stateName: string;
  }> {
    const state = await db.query.states.findFirst({
      where: eq(schema.states.id, stateId),
    });

    if (!state) {
      throw new Error("State not found");
    }

    const leaderboardQuery = sql`
      WITH member_points AS (
        SELECT 
          up.member_id,
          COALESCE(MAX(up.balance_after), 0) as total_points
        FROM ${schema.userPoints} up
        GROUP BY up.member_id
      ),
      ranked_members AS (
        SELECT 
          m.id as member_id,
          u.first_name || ' ' || u.last_name as member_name,
          COALESCE(mp.total_points, 0) as points,
          s.name as state_name,
          w.name as ward_name,
          ROW_NUMBER() OVER (ORDER BY COALESCE(mp.total_points, 0) DESC, m.created_at ASC) as rank
        FROM ${schema.members} m
        INNER JOIN ${schema.users} u ON m.user_id = u.id
        LEFT JOIN member_points mp ON m.id = mp.member_id
        INNER JOIN ${schema.wards} w ON m.ward_id = w.id
        INNER JOIN ${schema.lgas} l ON w.lga_id = l.id
        INNER JOIN ${schema.states} s ON l.state_id = s.id
        WHERE m.status = 'active' AND s.id = ${stateId}
      )
      SELECT * FROM ranked_members
      ORDER BY rank ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const leaderboard = await db.execute(leaderboardQuery);

    const countQuery = sql`
      SELECT COUNT(DISTINCT m.id)::int as total
      FROM ${schema.members} m
      INNER JOIN ${schema.wards} w ON m.ward_id = w.id
      INNER JOIN ${schema.lgas} l ON w.lga_id = l.id
      WHERE m.status = 'active' AND l.state_id = ${stateId}
    `;

    const countResult = await db.execute(countQuery);
    const total = (countResult.rows[0] as any)?.total || 0;

    return {
      leaderboard: leaderboard.rows.map((row: any) => ({
        rank: Number(row.rank),
        memberId: row.member_id,
        memberName: row.member_name,
        points: Number(row.points),
        stateName: row.state_name,
        wardName: row.ward_name,
      })),
      total,
      stateName: state.name,
    };
  }

  async getUserRank(memberId: string): Promise<{
    nationalRank: number | null;
    stateRank: number | null;
    points: number;
    stateName: string | null;
  }> {
    const member = await db.query.members.findFirst({
      where: eq(schema.members.id, memberId),
      with: {
        ward: {
          with: {
            lga: {
              with: {
                state: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new Error("Member not found");
    }

    const stateId = member.ward?.lga?.state?.id;
    const stateName = member.ward?.lga?.state?.name || null;

    const nationalRankQuery = sql`
      WITH member_points AS (
        SELECT 
          up.member_id,
          COALESCE(MAX(up.balance_after), 0) as total_points
        FROM ${schema.userPoints} up
        GROUP BY up.member_id
      ),
      ranked_members AS (
        SELECT 
          m.id as member_id,
          COALESCE(mp.total_points, 0) as points,
          ROW_NUMBER() OVER (ORDER BY COALESCE(mp.total_points, 0) DESC, m.created_at ASC) as rank
        FROM ${schema.members} m
        LEFT JOIN member_points mp ON m.id = mp.member_id
        WHERE m.status = 'active'
      )
      SELECT rank, points FROM ranked_members WHERE member_id = ${memberId}
    `;

    const nationalResult = await db.execute(nationalRankQuery);
    const nationalData = nationalResult.rows[0] as any;

    let stateRank: number | null = null;

    if (stateId) {
      const stateRankQuery = sql`
        WITH member_points AS (
          SELECT 
            up.member_id,
            COALESCE(MAX(up.balance_after), 0) as total_points
          FROM ${schema.userPoints} up
          GROUP BY up.member_id
        ),
        ranked_members AS (
          SELECT 
            m.id as member_id,
            COALESCE(mp.total_points, 0) as points,
            ROW_NUMBER() OVER (ORDER BY COALESCE(mp.total_points, 0) DESC, m.created_at ASC) as rank
          FROM ${schema.members} m
          LEFT JOIN member_points mp ON m.id = mp.member_id
          INNER JOIN ${schema.wards} w ON m.ward_id = w.id
          INNER JOIN ${schema.lgas} l ON w.lga_id = l.id
          WHERE m.status = 'active' AND l.state_id = ${stateId}
        )
        SELECT rank FROM ranked_members WHERE member_id = ${memberId}
      `;

      const stateResult = await db.execute(stateRankQuery);
      const stateData = stateResult.rows[0] as any;
      stateRank = stateData ? Number(stateData.rank) : null;
    }

    return {
      nationalRank: nationalData ? Number(nationalData.rank) : null,
      stateRank,
      points: nationalData ? Number(nationalData.points) : 0,
      stateName,
    };
  }

  async generateSnapshot(period: string = "all-time") {
    const [nationalLeaderboard] = await Promise.all([
      this.getNationalLeaderboard(100, 0),
    ]);

    const states = await db.query.states.findMany();

    const snapshots = [];

    snapshots.push({
      period,
      scope: "national",
      scopeId: null,
      data: nationalLeaderboard.leaderboard.map((entry) => ({
        rank: entry.rank,
        memberId: entry.memberId,
        points: entry.points,
        stateName: entry.stateName,
      })),
    });

    for (const state of states) {
      try {
        const stateLeaderboard = await this.getStateLeaderboard(state.id, 100, 0);
        
        snapshots.push({
          period,
          scope: "state",
          scopeId: state.id,
          data: stateLeaderboard.leaderboard.map((entry) => ({
            rank: entry.rank,
            memberId: entry.memberId,
            points: entry.points,
            stateName: entry.stateName,
          })),
        });
      } catch (error) {
        console.error(`Failed to generate snapshot for state ${state.name}:`, error);
      }
    }

    await db.insert(schema.leaderboardSnapshots).values(snapshots);

    return {
      snapshotsCreated: snapshots.length,
      period,
      timestamp: new Date(),
    };
  }
}

export const leaderboardService = new LeaderboardService();
