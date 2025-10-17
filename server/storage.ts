import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// The storage interface has been replaced with direct database access via Drizzle ORM
// All data operations now use db.query and db.insert/update/delete methods
// See server/routes.ts for API implementations

export { db };
export const storage = {
  // Helper methods can be added here if needed
};
