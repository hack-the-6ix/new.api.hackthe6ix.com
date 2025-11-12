import { pgTable, uuid, char, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const event = pgTable("event", {
  eventId: uuid("eventId")
    .primaryKey()
    .default(sql`uuidv7()`),
  seasonCode: char("seasonCode", { length: 3 }).references(
    () => season.seasonCode,
    { onUpdate: "cascade" },
  ),
  eventName: text("eventName").notNull(),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
});
