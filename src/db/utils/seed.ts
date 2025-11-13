import env from "@/config/env";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { seed } from "drizzle-seed";

if (!env.DB_SEEDING) {
  throw new Error('You must set DB_SEEDING to "true" when running seeds');
}

await seed(db, schema, { seed: 1, count: 10 });

console.log("Seeding completed.");
