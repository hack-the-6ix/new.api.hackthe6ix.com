import { db } from "@/db";
import { event } from "@/db/schema/event";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";
import { eq } from "drizzle-orm";

export const fetchEvents = async (seasonCode: string) => {
  try {
    const result = await db
      .select()
      .from(event)
      .where(eq(event.seasonCode, seasonCode));
    return result;
  } catch (error: unknown) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};
