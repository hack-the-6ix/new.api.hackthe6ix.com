import {
  pgTable,
  uuid,
  char,
  text,
  varchar,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";
import { form } from "./form";

export const formQuestion = pgTable(
  "formQuestion",
  {
    formQuestionId: varchar("formQuestionId", { length: 80 }),
    formId: uuid("formId")
      .notNull()
      .default(sql`uuidv7()`),
    seasonCode: char("seasonCode", { length: 3 }).references(
      () => season.seasonCode,
      { onUpdate: "cascade" }
    ),
    questionType: text("questionType"),
    tags: text("tags")
      .array()
      .default(sql`ARRAY[]::text[]`),
  },
  (t) => [
    primaryKey({ columns: [t.formQuestionId, t.formId, t.seasonCode] }),
    foreignKey({
      columns: [t.seasonCode, t.formId],
      foreignColumns: [form.seasonCode, form.formId], // form(seasonCode, eventId)
    }).onDelete("cascade"),
  ]
);
