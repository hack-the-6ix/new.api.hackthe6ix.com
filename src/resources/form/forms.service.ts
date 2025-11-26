import { db } from "@/db";
import { form } from "@/db/schema/form";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";

export interface CreateFormInput {
  seasonCode: string;
  openTime?: Date | null;
  closeTime?: Date | null;
  tags?: string[];
}

export const createForm = async (input: CreateFormInput) => {
  try {
    const result = await db
      .insert(form)
      .values({
        seasonCode: input.seasonCode,
        openTime: input.openTime ?? null,
        closeTime: input.closeTime ?? null,
        tags: input.tags ?? [],
      })
      .returning();
    return result[0];
  } catch (error: unknown) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};
