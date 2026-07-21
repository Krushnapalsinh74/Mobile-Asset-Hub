import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// db is null when DATABASE_URL is not configured.
// Routes must check for null and return graceful fallbacks instead of crashing.
export const db = process.env.DATABASE_URL
  ? drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema })
  : null;

export * from "./schema";
