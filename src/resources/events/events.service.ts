import { db } from "@/db";
import { eventCheckIn } from "@/db/schema";
import { event } from "@/db/schema/event";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";
import { eq, sql } from "drizzle-orm";

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

export const createEvent = async (
  seasonCode: string,
  eventName: string,
  startTime: string,
  endTime: string,
) => {
  try {
    const result = await db
      .insert(event)
      .values({
        seasonCode,
        eventName,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
      })
      .onConflictDoNothing()
      .returning();

    return result.length > 0 ? result[0] : null;
  } catch (error: unknown) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};

export const checkInUser = async (
  seasonCode: string,
  eventId: string,
  userId: string,
  checkInAuthor: string,
  checkInNotes?: string,
) => {
  try {
    const result = await db
      .insert(eventCheckIn)
      .values({
        seasonCode,
        eventId,
        userId,
        checkInAuthor,
        checkInNotes: checkInNotes || null,
      })
      .onConflictDoUpdate({
        target: [eventCheckIn.userId, eventCheckIn.eventId],
        set: {
          checkInAuthor,
          checkInNotes: checkInNotes || null,
          createdAt: sql`NOW()`,
        },
      })
      .returning();

    return result.length > 0 ? result[0] : null;
  } catch (error: unknown) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};
