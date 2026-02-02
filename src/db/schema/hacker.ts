import {
  pgTable,
  pgEnum,
  char,
  uuid,
  real,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";
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
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
    score: real("score").notNull(),
    status: hackerStatusEnum("status"),
    nfcId: text("nfcId").unique(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seasonCode] })],
);
