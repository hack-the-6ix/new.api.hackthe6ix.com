import { pgTable, char, uuid, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { season } from "./season";

export const volunteer = pgTable(
  "volunteer",
  {
    volunteerId: uuid("volunteerId")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
  },
  (t) => [unique().on(t.userId, t.seasonCode)],
);
