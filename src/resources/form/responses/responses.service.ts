import { db } from "@/db";
import { formResponse } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";

export const getAllFormResponses = async (
  seasonCode: string,
  formId?: string,
  userId?: string,
) => {
  try {
    const responses = await db
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.seasonCode, seasonCode),
          formId ? eq(formResponse.formId, formId) : undefined,
          userId ? eq(formResponse.userId, userId) : undefined,
        ),
      );
    return responses;
  } catch (error) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};

export const validateFormResponseJson = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  responseJson: unknown,
) => {
  // implement validation logic here
  // get questions from form question table based on formId
  // check that responseJson has valid answers for each question based on question type and tags

  return []; // return array of validation error messages, empty array if valid
};

export const updateFormResponse = async (
  seasonCode: string,
  userId: string,
  formId: string,
  responseJson: unknown,
  isSubmitted: boolean,
) => {
  try {
    const result = await db
      .insert(formResponse)
      .values({
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      })
      .onConflictDoUpdate({
        target: [
          formResponse.seasonCode,
          formResponse.userId,
          formResponse.formId,
        ],
        set: {
          responseJson,
          isSubmitted,
          updatedAt: new Date(),
        },
      });
    return result;
  } catch (error) {
    const dbError = getDbErrorMessage(error);
    throw new Error(dbError.message);
  }
};
