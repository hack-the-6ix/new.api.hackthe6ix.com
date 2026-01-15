import { config } from "dotenv";

// Load environment variables into script
config();
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

import * as Schema from "../src/db/schema";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

// Initialize database client
const client = new SQL(DATABASE_URL, {
  adapter: "postgres",
  max: 1,
});

const db = drizzle(client, {
  schema: Schema,
  casing: "camelCase",
  logger: false,
});

// Run migrations
async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "migrations" });
  console.log("Migrations completed.");
}

runMigrations();
