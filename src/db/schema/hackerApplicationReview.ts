import {
  pgTable,
  char,
  uuid,
  real,
  text,
  timestamp,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { admin } from "./admin";
import { season } from "./season";
import { hacker } from "./hacker";

export const hackerApplicationReview = pgTable(
  "hackerApplicationReview",
  {
    hackerApplicationReviewId: uuid("hackerApplicationReviewId").default(
      sql`uuidv7()`,
    ),
    seasonCode: char("seasonCode", { length: 3 }).references(
      () => season.seasonCode,
      {
        onUpdate: "cascade",
      },
    ),
    winnerId: uuid("winnerId"),
    loserId: uuid("loserId"),
    winnerNewScore: real("winnerNewScore"),
    loserNewScore: real("loserNewScore"),
    winnerOldScore: real("winnerOldScore"),
    loserOldScore: real("loserOldScore"),
    reviewNotes: text("reviewNotes"),
    reviewerId: uuid("reviewerId").references(() => admin.userId),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.hackerApplicationReviewId, t.seasonCode] }),
    foreignKey({
      columns: [t.winnerId, t.seasonCode],
      foreignColumns: [hacker.userId, hacker.seasonCode],
    }),
    foreignKey({
      columns: [t.loserId, t.seasonCode],
      foreignColumns: [hacker.userId, hacker.seasonCode],
    }),
  ],
);
