import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { PgliteDatabase } from "drizzle-orm/pglite";

export const createTestDatabase = async () => {
  const pgLite = new PGlite();
  const db = drizzle(pgLite, {
    schema,
    casing: "camelCase",
  });

  // PGlite 0.3.x operates on postgres 17, doesn't support uuidv7() built-in
  // Mock uuidv7 extension support
  await db.execute(`
    CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
    BEGIN
      RETURN gen_random_uuid();
    END;
    $$ LANGUAGE plpgsql;
  `);

  await migrate(db, { migrationsFolder: "migrations" });
  return db;
};

export type TestDbMocks = {
  testDb: PgliteDatabase<typeof schema>;
};

/**
 * Creates the test database and assigns it to mocks.testDb
 * @param mocks - The mocks object to populate with the database instance
 */
export const initializeTestDb = async (mocks: TestDbMocks) => {
  mocks.testDb = await createTestDatabase();
};
