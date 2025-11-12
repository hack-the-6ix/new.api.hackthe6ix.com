import { pgTable, uuid, boolean } from "drizzle-orm/pg-core";

export const admin = pgTable("admin", {
  userId: uuid("userId").primaryKey(),
  superUser: boolean("superUser").default(false),
});
