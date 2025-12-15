import { pgTable, uuid, char, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const form = pgTable("form", {
  formId: uuid("formId")
    .default(sql`uuidv7()`)
    .primaryKey(),
  seasonCode: char("seasonCode", { length: 3 }).references(
    () => season.seasonCode,
    { onUpdate: "cascade" }
  ),
  formName: text("formName"),
  openTime: timestamp("openTime"),
  closeTime: timestamp("closeTime"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});
