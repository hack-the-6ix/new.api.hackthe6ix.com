import { pgTable, uuid, char, text, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";
import { form } from "./form";

export const formQuestion = pgTable("formQuestion", {
  formQuestionId: varchar("formQuestionId", { length: 80 }).primaryKey(),
  formId: uuid("formId").references(() => form.formId, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  seasonCode: char("seasonCode", { length: 3 }).references(
    () => season.seasonCode,
    { onUpdate: "cascade" },
  ),
  questionType: text("questionType"),
  tags: text("tags")
    .array()
    .default(sql`ARRAY[]::text[]`),
});
