import { db } from "@/db";
import { season } from "@/db/schema/season";
import { handleDbError } from "@/db/utils/dbErrorUtils";

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
