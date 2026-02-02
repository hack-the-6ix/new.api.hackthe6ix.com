/**
 * Usage:
 *   bun run scripts/seed.ts           # Seed the database
 *   bun run scripts/seed.ts --reset   # Clear all data first, then seed
 */

import { config } from "dotenv";
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

import * as schema from "@/db/schema";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { reset } from "drizzle-seed";
import { logSection, logSeed } from "./seed-data/helpers";
import { seasons } from "./seed-data/seasons";
import { admins } from "./seed-data/admins";
import { forms } from "./seed-data/forms";
import { questions } from "./seed-data/questions";
import { responses } from "./seed-data/responses";
import { events } from "./seed-data/events";
import { hackers } from "./seed-data/hackers";
import { checkins } from "./seed-data/checkins";
import { reviews } from "./seed-data/reviews";

export const client = new SQL(DATABASE_URL, {
  adapter: "postgres",
  max: 1,
});

export const db = drizzle(client, {
  schema,
  casing: "camelCase",
  logger: false, // Disable query logging for cleaner output
});

/**
 * Clear all tables using drizzle-seed's reset
 */
async function clearDatabase() {
  logSection("🗑️  Clearing database...");
  await reset(db, schema);
  console.log("  ✓ All tables cleared");
}

/**
 * Seed all tables in dependency order
 */
async function seedDatabase() {
  logSection("🌱 Seeding database...");

  // Level 0: Independent tables
  await db.insert(schema.season).values(seasons).onConflictDoNothing();
  logSeed("seasons", seasons.length);

  await db.insert(schema.admin).values(admins).onConflictDoNothing();
  logSeed("admins", admins.length);

  // Level 1: Tables depending on season
  await db.insert(schema.form).values(forms).onConflictDoNothing();
  logSeed("forms", forms.length);

  await db.insert(schema.event).values(events).onConflictDoNothing();
  logSeed("events", events.length);

  await db.insert(schema.hacker).values(hackers).onConflictDoNothing();
  logSeed("hackers", hackers.length);

  // Level 2: Tables with composite foreign keys
  await db.insert(schema.formQuestion).values(questions).onConflictDoNothing();
  logSeed("form questions", questions.length);

  await db.insert(schema.formResponse).values(responses).onConflictDoNothing();
  logSeed("form responses", responses.length);

  await db.insert(schema.eventCheckIn).values(checkins).onConflictDoNothing();
  logSeed("event check-ins", checkins.length);

  await db
    .insert(schema.hackerApplicationReview)
    .values(reviews)
    .onConflictDoNothing();
  logSeed("hacker application reviews", reviews.length);

  logSection("✅ Seeding completed successfully!");
}

/**
 * Main execution
 */
async function main() {
  try {
    const processArgs = process.argv.slice(2);

    if (processArgs.includes("--reset")) {
      await clearDatabase();
    }

    await seedDatabase();
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
