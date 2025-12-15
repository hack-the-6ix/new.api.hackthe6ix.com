import {
  pgTable,
  pgEnum,
  char,
  uuid,
  unique,
  real,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const hackerStatusEnum = pgEnum("hackerStatus", [
  "no apply",
  "applied",
  "accepted",
  "rejected",
  "rsvped",
  "checked-in",
]);

export const hacker = pgTable(
  "hacker",
  {
    hackerId: uuid("hackerId").default(sql`uuidv7()`),
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
    score: real("score").notNull(),
    status: hackerStatusEnum("status"),
    nfcId: text("nfcId").unique(),
  },
  (t) => [
    unique().on(t.userId, t.seasonCode),
    primaryKey({ columns: [t.hackerId, t.seasonCode] }),
  ],
);
