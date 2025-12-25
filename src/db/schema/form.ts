import {
  pgTable,
  uuid,
  char,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const form = pgTable(
  "form",
  {
    formId: uuid("formId")
      .notNull()
      .default(sql`uuidv7()`),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
    eventId: uuid("eventId")
      .notNull()
      .default(sql`uuidv7()`),
    formName: text("formName"),
    openTime: timestamp("openTime"),
    closeTime: timestamp("closeTime"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
  },
  (t) => [
    primaryKey({
      columns: [t.seasonCode, t.formId],
    }),
  ]
);
