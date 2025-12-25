import {
  pgTable,
  uuid,
  char,
  jsonb,
  boolean,
  timestamp,
  unique,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";
import { form } from "./form";

export const formResponse = pgTable(
  "formResponse",
  {
    formResponseId: uuid("formResponseId").default(sql`uuidv7()`),
    formId: uuid("formId")
      .notNull()
      .default(sql`uuidv7()`),
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 }).references(
      () => season.seasonCode,
      { onUpdate: "cascade" }
    ),
    responseJson: jsonb("responseJson").notNull(),
    isSubmitted: boolean("isSubmitted").default(false),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.formResponseId, t.seasonCode] }),
    unique().on(t.seasonCode, t.userId, t.formId),
    foreignKey({
      columns: [t.seasonCode, t.formId],
      foreignColumns: [form.seasonCode, form.formId], // form(seasonCode, eventId)
    }).onDelete("cascade"),
  ]
);
