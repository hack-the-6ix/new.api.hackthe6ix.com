import { pgTable, char, uuid, unique, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const sponsor = pgTable(
  "sponsor",
  {
    sponsorId: uuid("sponsorId")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
    org: text("org"),
  },
  (t) => [unique().on(t.userId, t.seasonCode)],
);
