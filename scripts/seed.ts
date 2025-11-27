import env from "@/config/env";
import * as schema from "@/db/schema";
import { SQL } from "bun";
import { seed, reset } from "drizzle-seed";
import { drizzle } from "drizzle-orm/bun-sql";

export const client = new SQL(env.DATABASE_URL, {
  adapter: "postgres",
  max: 1,
});

export const db = drizzle(client, {
  schema,
  casing: "camelCase",
  logger: true,
});

const processArgs = process.argv.slice(2);
if (processArgs.includes("--reset")) {
  console.log("Resetting database before seeding...");
  await reset(db, schema);
  console.log("Database reset completed.");
}

await seed(db, schema, { seed: 1 }).refine((f) => ({
  season: {
    count: 2,
    columns: {
      seasonCode: f.valuesFromArray({ values: ["S26", "S27"] }),
    },
  },
  form: {
    count: 4,
    with: {
      formResponse: 10,
      formQuestion: 5,
    },
  },
  event: {
    count: 6,
    with: {
      eventCheckIn: 10,
    },
  },
}));

console.log("Seeding completed.");
