import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Starting gamification schema migration...");

  try {
    // Point Purchases table
    await sql`CREATE TABLE IF NOT EXISTS point_purchases (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id VARCHAR NOT NULL REFERENCES members(id),
      amount INTEGER NOT NULL,
      points INTEGER NOT NULL,
      paystack_reference VARCHAR NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_point_purchases_member ON point_purchases(member_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_point_purchases_status ON point_purchases(status)`;

    // Social Shares table
    await sql`CREATE TABLE IF NOT EXISTS social_shares (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id VARCHAR NOT NULL REFERENCES members(id),
      platform TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id VARCHAR NOT NULL,
      share_url TEXT NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_social_shares_unique ON social_shares(member_id, platform, content_type, content_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_social_shares_member ON social_shares(member_id)`;

    // Share Verifications table
    await sql`CREATE TABLE IF NOT EXISTS share_verifications (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      share_id VARCHAR NOT NULL REFERENCES social_shares(id),
      verification_method TEXT NOT NULL,
      verified_at TIMESTAMP,
      metadata JSONB
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_share_verifications_share ON share_verifications(share_id)`;

    // Volunteer Task Funding table
    await sql`CREATE TABLE IF NOT EXISTS volunteer_task_funding (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id VARCHAR NOT NULL UNIQUE REFERENCES volunteer_tasks(id),
      funder_id VARCHAR NOT NULL REFERENCES members(id),
      total_points_locked INTEGER NOT NULL,
      points_distributed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'locked',
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_volunteer_task_funding_unique ON volunteer_task_funding(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_task_funding_funder ON volunteer_task_funding(funder_id)`;

    // Leaderboard Snapshots table
    await sql`CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id VARCHAR NOT NULL REFERENCES members(id),
      total_points INTEGER NOT NULL,
      national_rank INTEGER,
      state_rank INTEGER,
      state_id VARCHAR REFERENCES states(id),
      snapshot_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_date ON leaderboard_snapshots(snapshot_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_member ON leaderboard_snapshots(member_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_state ON leaderboard_snapshots(state_id)`;

    console.log("✓ All gamification tables created");

    // Creator-funder parity constraint
    await sql`CREATE OR REPLACE FUNCTION check_task_funder_parity()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM volunteer_tasks 
          WHERE id = NEW.task_id 
          AND creator_id = NEW.funder_id
        ) THEN
          RAISE EXCEPTION 'Funder must be the task creator';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`;

    await sql`DROP TRIGGER IF EXISTS enforce_task_funder_parity ON volunteer_task_funding`;
    await sql`CREATE TRIGGER enforce_task_funder_parity
      BEFORE INSERT OR UPDATE ON volunteer_task_funding
      FOR EACH ROW 
      EXECUTE FUNCTION check_task_funder_parity()`;

    console.log("✓ Creator-funder parity trigger created");

    // Modify existing tables - creator_id NOT NULL
    try {
      await sql`ALTER TABLE volunteer_tasks ALTER COLUMN creator_id SET NOT NULL`;
      console.log("✓ volunteer_tasks.creator_id set to NOT NULL");
    } catch (e: any) {
      if (e.message?.includes('column "creator_id" of relation "volunteer_tasks" does not exist')) {
        console.log("⚠ volunteer_tasks.creator_id column doesn't exist yet, skipping NOT NULL constraint");
      } else {
        throw e;
      }
    }

    // Enhance user_points table with ledger columns
    try {
      await sql`ALTER TABLE user_points ADD COLUMN IF NOT EXISTS transaction_type TEXT`;
      await sql`ALTER TABLE user_points ADD COLUMN IF NOT EXISTS reference_type TEXT`;
      await sql`ALTER TABLE user_points ADD COLUMN IF NOT EXISTS reference_id VARCHAR`;
      await sql`ALTER TABLE user_points ADD COLUMN IF NOT EXISTS balance_after INTEGER`;
      await sql`ALTER TABLE user_points ADD COLUMN IF NOT EXISTS metadata JSONB`;
      console.log("✓ user_points ledger columns added");
    } catch (e: any) {
      console.log("⚠ Error adding user_points columns:", e.message);
    }

    // Add indexes for user_points
    await sql`CREATE INDEX IF NOT EXISTS idx_user_points_member_created ON user_points(member_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_points_ref_type_ref_id ON user_points(reference_type, reference_id)`;

    console.log("✓ user_points indexes created");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
