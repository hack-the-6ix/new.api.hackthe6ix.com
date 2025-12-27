import {
  pgTable,
  uuid,
  char,
  timestamp,
  text,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { season } from "./season";
import { event } from "./event";
import { hacker } from "./hacker";

export const eventCheckIn = pgTable(
  "eventCheckIn",
  {
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, {
        onUpdate: "cascade",
      }),

    eventId: uuid("eventId").notNull(),

    userId: uuid("userId").notNull(),

    checkInAuthor: uuid("checkInAuthor").notNull(),
    checkInNotes: text("checkInNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.seasonCode, t.eventId, t.userId],
    }),
    foreignKey({
      columns: [t.seasonCode, t.eventId],
      foreignColumns: [event.seasonCode, event.eventId], // event(seasonCode, eventId)
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.seasonCode, t.userId],
      foreignColumns: [hacker.seasonCode, hacker.userId], // event(seasonCode, eventId)
    }).onDelete("cascade"),
  ]
);
