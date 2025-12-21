import { db } from "@/db";
import { form, formQuestion } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";

export interface CreateFormQuestionInput {
  formQuestionId: string;
  questionType: string;
  tags?: string[];
}

export interface CreateFormInput {
  seasonCode: string;
  openTime?: Date | null;
  closeTime?: Date | null;
  tags?: string[];
  questions?: CreateFormQuestionInput[];
}

export const createForm = async (input: CreateFormInput) => {
  try {
    // Create the form first
    const [createdForm] = await db
      .insert(form)
      .values({
        seasonCode: input.seasonCode,
        openTime: input.openTime ?? null,
        closeTime: input.closeTime ?? null,
        tags: input.tags ?? [],
      })
      .returning();

    // Create questions if provided
    if (input.questions && input.questions.length > 0) {
      await db.insert(formQuestion).values(
        input.questions.map((question) => ({
          formQuestionId: question.formQuestionId,
          formId: createdForm.formId,
          seasonCode: input.seasonCode,
          questionType: question.questionType,
          tags: question.tags ?? [],
        })),
      );
    }

    return createdForm;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};
