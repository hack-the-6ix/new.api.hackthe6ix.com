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

export const event = pgTable(
  "event",
  {
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, {
        onUpdate: "cascade",
      }),

    eventId: uuid("eventId")
      .notNull()
      .default(sql`uuidv7()`),

    eventName: text("eventName").notNull(),
    startTime: timestamp("startTime"),
    endTime: timestamp("endTime"),
  },
  (t) => [
    primaryKey({
      columns: [t.seasonCode, t.eventId],
    }),
  ],
);
