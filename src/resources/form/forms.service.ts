import { db } from "@/db";
import { form, formQuestion } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/errors";

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
    const [createdForm] = await db
      .insert(form)
      .values({
        seasonCode: input.seasonCode,
        openTime: input.openTime ?? null,
        closeTime: input.closeTime ?? null,
        tags: input.tags ?? [],
      })
      .returning();

    if (input.questions && input.questions.length > 0) {
      await db.insert(formQuestion).values(
        input.questions.map((q) => ({
          formQuestionId: q.formQuestionId,
          formId: createdForm.formId,
          seasonCode: input.seasonCode,
          questionType: q.questionType,
          tags: q.tags ?? [],
        })),
      );
    }

    return createdForm;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export interface UpdateFormInput {
  seasonCode: string;
  formId: string;
  openTime?: Date | null;
  closeTime?: Date | null;
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
    // Ensure the form exists (and is in the given season)
    const existing = await db
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

    const [updated] = await db
      .update(form)
      .set({
        openTime: input.openTime ?? null,
        closeTime: input.closeTime ?? null,
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
      await db
        .delete(formQuestion)
        .where(
          and(
            eq(formQuestion.formId, input.formId),
            eq(formQuestion.seasonCode, input.seasonCode),
          ),
        );

      if (input.questions.length > 0) {
        await db.insert(formQuestion).values(
          input.questions.map((q) => ({
            formQuestionId: q.formQuestionId,
            formId: input.formId,
            seasonCode: input.seasonCode,
            questionType: q.questionType,
            tags: q.tags ?? [],
          })),
        );
      }
    }

    return updated;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const deleteForm = async (seasonCode: string, formId: string) => {
  try {
    // Ensure exists
    const existing = await db
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

    // Delete children first (avoid FK issues)
    await db
      .delete(formQuestion)
      .where(
        and(
          eq(formQuestion.formId, formId),
          eq(formQuestion.seasonCode, seasonCode),
        ),
      );

    // Delete the form
    await db
      .delete(form)
      .where(and(eq(form.formId, formId), eq(form.seasonCode, seasonCode)));

    return;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};

export const cloneForm = async (seasonCode: string, formId: string) => {
  try {
    // Load existing form
    const [src] = await db
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

    // Load existing questions
    const srcQuestions = await db
      .select()
      .from(formQuestion)
      .where(
        and(
          eq(formQuestion.formId, formId),
          eq(formQuestion.seasonCode, seasonCode),
        ),
      );

    // Create new form (same fields)
    const [cloned] = await db
      .insert(form)
      .values({
        seasonCode: src.seasonCode,
        openTime: src.openTime ?? null,
        closeTime: src.closeTime ?? null,
        tags: src.tags ?? [],
      })
      .returning();

    // Clone questions (new formId; new question ids to avoid collisions)
    if (srcQuestions.length > 0) {
      await db.insert(formQuestion).values(
        srcQuestions.map((q) => ({
          // generate a new id so we never collide if formQuestionId is globally unique
          formQuestionId: crypto.randomUUID(),
          formId: cloned.formId,
          seasonCode,
          questionType: q.questionType,
          tags: q.tags ?? [],
        })),
      );
    }

    return cloned;
  } catch (error: unknown) {
    throw handleDbError(error);
  }
};
