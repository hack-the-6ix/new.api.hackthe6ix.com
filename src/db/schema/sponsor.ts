import { pgTable, char, uuid, text, primaryKey } from "drizzle-orm/pg-core";
import { season } from "./season";

export const sponsor = pgTable(
  "sponsor",
  {
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
    org: text("org"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seasonCode] })],
);
