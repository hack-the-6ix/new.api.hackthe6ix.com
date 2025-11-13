import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "@/db/schema";
import env from "@/config/env";

export const client = new SQL(env.DATABASE_URL, {
  adapter: "postgres",
  max: env.DB_SEEDING ? 1 : 10,
});

export const db = drizzle(client, {
  schema,
  casing: "camelCase",
  logger: true,
});

export type db = typeof db;

export default db;
