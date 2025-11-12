import { pgTable, char, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const season = pgTable("season", {
  seasonId: uuid("seasonId")
    .primaryKey()
    .default(sql`uuidv7()`),
  seasonCode: char("seasonCode", { length: 3 }).notNull().unique(),
  hackerApplicationFormId: uuid("hackerApplicationFormId").unique(),
  rsvpFormId: uuid("rsvpFormId").unique(),
});
