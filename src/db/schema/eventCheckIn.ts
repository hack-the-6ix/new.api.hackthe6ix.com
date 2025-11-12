import {
  pgTable,
  uuid,
  char,
  timestamp,
  unique,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";
import { event } from "./event";

export const eventCheckIn = pgTable(
  "eventCheckIn",
  {
    eventCheckInId: uuid("eventCheckInId")
      .primaryKey()
      .default(sql`uuidv7()`),
    seasonCode: char("seasonCode", { length: 3 }).references(
      () => season.seasonCode,
      { onUpdate: "cascade" },
    ),
    userId: uuid("userId").notNull(),
    eventId: uuid("eventId")
      .notNull()
      .references(() => event.eventId, { onDelete: "cascade" }),
    checkInAuthor: uuid("checkInAuthor").notNull(),
    checkInNotes: text("checkInNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.userId, t.eventId), // A user can only check in once per event
  ],
);
