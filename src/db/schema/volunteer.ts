import { pgTable, char, uuid, primaryKey } from "drizzle-orm/pg-core";
import { season } from "./season";

export const volunteer = pgTable(
  "volunteer",
  {
    userId: uuid("userId").notNull(),
    seasonCode: char("seasonCode", { length: 3 })
      .notNull()
      .references(() => season.seasonCode, { onUpdate: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seasonCode] })],
);
