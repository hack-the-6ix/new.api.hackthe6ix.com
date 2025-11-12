import {
  pgTable,
  uuid,
  char,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";
import { form } from "./form";

export const formResponse = pgTable("formResponse", {
  formResponseId: uuid("formResponseId")
    .primaryKey()
    .default(sql`uuidv7()`),
  formId: uuid("formId").references(() => form.formId, {
    onDelete: "cascade",
  }),
  userId: uuid("userId").notNull(),
  seasonCode: char("seasonCode", { length: 3 }).references(
    () => season.seasonCode,
  ),
  responseJson: jsonb("responseJson").notNull(),
  isSubmitted: boolean("isSubmitted").default(false),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

