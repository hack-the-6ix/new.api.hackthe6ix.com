import { db } from "@/db";
import { form, formQuestion } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/errors";

export interface CreateFormQuestionInput {
  formQuestionRef: string;
  questionType: string;
  tags?: string[];
}

export interface CreateFormInput {
  seasonCode: string;
  openTime: Date | null;
  closeTime: Date | null;
  tags?: string[];
  questions?: CreateFormQuestionInput[];
}

export const getAllForms = async (seasonCode: string) => {
  try {
    const result = await db
      .select()
      .from(form)
      .where(eq(form.seasonCode, seasonCode));
    return result ?? null;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const getForms = async (seasonCode: string, formId: string) => {
  try {
    const formResult = await db
      .select()
      .from(form)
      .where(and(eq(form.seasonCode, seasonCode), eq(form.formId, formId)))
      .limit(1);
    const questions = await await db
      .select()
      .from(formQuestion)
      .where(
        and(
          eq(formQuestion.seasonCode, seasonCode),
          formId ? eq(formQuestion.formId, formId) : undefined,
        ),
      );
    return formResult[0]
      ? {
          ...formResult[0],
          questions,
        }
      : null;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const createForm = async (input: CreateFormInput) => {
  try {
    return await db.transaction(async (tx) => {
      const [createdForm] = await tx
        .insert(form)
        .values({
          seasonCode: input.seasonCode,
          openTime: input.openTime,
          closeTime: input.closeTime,
          tags: input.tags ?? [],
        })
        .returning();

      if (input.questions && input.questions.length > 0) {
        await tx.insert(formQuestion).values(
          input.questions.map((q) => ({
            formQuestionRef: q.formQuestionRef,
            formId: createdForm.formId,
            seasonCode: input.seasonCode,
            questionType: q.questionType,
            tags: q.tags ?? [],
          })),
        );
      }

      return createdForm;
    });
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export interface UpdateFormInput {
  seasonCode: string;
  formId: string;
  openTime: Date | null;
  closeTime: Date | null;
  tags?: string[];
  /**
   * Optional:
   * - if provided, we "replace" questions (delete existing + insert new)
   * - if omitted, questions remain unchanged
   */
  questions?: CreateFormQuestionInput[];
}

export const updateForm = async (input: UpdateFormInput) => {
  try {
    return await db.transaction(async (tx) => {
      // Ensure the form exists (and is in the given season)
      const existing = await tx
        .select()
        .from(form)
        .where(
          and(
            eq(form.formId, input.formId),
            eq(form.seasonCode, input.seasonCode),
          ),
        );

      if (existing.length === 0) {
        throw new ApiError(404, {
          code: "FORM_NOT_FOUND",
          message: "Form not found",
          suggestion: "Check the formId and seasonCode",
        });
      }

      const [updated] = await tx
        .update(form)
        .set({
          openTime: input.openTime,
          closeTime: input.closeTime,
          tags: input.tags ?? [],
        })
        .where(
          and(
            eq(form.formId, input.formId),
            eq(form.seasonCode, input.seasonCode),
          ),
        )
        .returning();

      // Replace questions only if caller provided questions
      if (input.questions) {
        await tx
          .delete(formQuestion)
          .where(
            and(
              eq(formQuestion.formId, input.formId),
              eq(formQuestion.seasonCode, input.seasonCode),
            ),
          );

        if (input.questions.length > 0) {
          await tx.insert(formQuestion).values(
            input.questions.map((q) => ({
              formQuestionRef: q.formQuestionRef,
              formId: input.formId,
              seasonCode: input.seasonCode,
              questionType: q.questionType,
              tags: q.tags ?? [],
            })),
          );
        }
      }

      return updated;
    });
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const deleteForm = async (seasonCode: string, formId: string) => {
  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(form)
        .where(and(eq(form.formId, formId), eq(form.seasonCode, seasonCode)));

      if (existing.length === 0) {
        throw new ApiError(404, {
          code: "FORM_NOT_FOUND",
          message: "Form not found",
          suggestion: "Check the formId and seasonCode",
        });
      }

      await tx
        .delete(form)
        .where(and(eq(form.formId, formId), eq(form.seasonCode, seasonCode)));
      // formQuestion rows are removed via ON DELETE CASCADE
    });
  } catch (error) {
    throw handleDbError(error);
  }
};

export const cloneForm = async (
  seasonCode: string,
  formId: string,
  formName?: string,
) => {
  try {
    return await db.transaction(async (tx) => {
      // Load source form
      const [src] = await tx
        .select()
        .from(form)
        .where(and(eq(form.formId, formId), eq(form.seasonCode, seasonCode)));

      if (!src) {
        throw new ApiError(404, {
          code: "FORM_NOT_FOUND",
          message: "Form not found",
          suggestion: "Check the formId and seasonCode",
        });
      }

      // Load source questions
      const srcQuestions = await tx
        .select()
        .from(formQuestion)
        .where(
          and(
            eq(formQuestion.formId, formId),
            eq(formQuestion.seasonCode, seasonCode),
          ),
        );

      // Create cloned form (with optional formName)
      const [cloned] = await tx
        .insert(form)
        .values({
          seasonCode: src.seasonCode,
          formName: formName || src.formName,
          openTime: src.openTime,
          closeTime: src.closeTime,
          tags: src.tags ?? [],
          // new id auto generated
        })
        .returning();

      if (srcQuestions.length > 0) {
        const newQuestions = srcQuestions.map((q) => ({
          formQuestionRef: q.formQuestionRef,
          formId: cloned.formId,
          seasonCode: src.seasonCode,
          questionType: q.questionType,
          tags: q.tags ?? [],
        }));

        await tx.insert(formQuestion).values(newQuestions);
      }
      return cloned;
    });
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};
