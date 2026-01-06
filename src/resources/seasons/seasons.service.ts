import { db } from "@/db";
import { season } from "@/db/schema/season";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { eq } from "drizzle-orm";

export const createSeason = async (seasonCode: string) => {
  try {
    const result = await db
      .insert(season)
      .values({ seasonCode })
      .onConflictDoNothing()
      .returning();
    if (result.length === 0) {
      return false;
    }
    return true;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const getSeasonDetails = async (seasonCode: string) => {
  try {
    const result = await db
      .select()
      .from(season)
      .where(eq(season.seasonCode, seasonCode))
      .limit(1);
    return result[0] ?? null;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};
