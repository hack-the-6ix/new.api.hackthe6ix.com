import { db } from "@/db";
import { admin } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { eq } from "drizzle-orm";

export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const res = await db.select().from(admin).where(eq(admin.userId, userId));
    return res.length > 0;
  } catch (error) {
    throw handleDbError(error);
  }
};
