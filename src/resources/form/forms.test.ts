import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock env first
vi.mock("@/config/env", () => ({
  default: {
    NODE_ENV: "test",
    DB_HOST: "localhost",
    DB_USER: "test",
    DB_PASSWORD: "test",
    DB_NAME: "test",
    DB_PORT: 5432,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
}));

// --- db + schema mocks ---
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  form: { formId: "form.formId", seasonCode: "form.seasonCode" },
  formQuestion: {
    formId: "formQuestion.formId",
    seasonCode: "formQuestion.seasonCode",
  },
}));

import { ApiError } from "@/lib/errors";

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn((error) => {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      return new ApiError(500, {
        code: "DATABASE_ERROR",
        message: error.message,
      });
    }
    return new ApiError(500, {
      code: "UNKNOWN_ERROR",
      message: "Unknown error",
    });
  }),
}));

import { db } from "@/db";
import { form, formQuestion } from "@/db/schema";
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
} from "@/resources/form/forms.service";

const FORM_ID = "019b4d85-4bd6-74b3-9485-88343744d21c";
const FORM_ID_2 = "019b4d79-2623-79e4-8615-e46f1ac64125";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("forms.service", () => {
  describe("createForm", () => {
    it("creates a form successfully without questions", async () => {
      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);

      const valuesMock = vi.fn(() => ({ returning: returningMock }));
      (db.insert as Mock).mockReturnValue({ values: valuesMock });

      const result = await createForm({
        seasonCode: "S26",
        tags: ["registration"],
      });

      expect(result).toEqual({
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
      });

      expect(db.insert).toHaveBeenCalledWith(form);
      expect(valuesMock).toHaveBeenCalledWith({
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
      });
    });

    it("creates a form with questions (inserts into formQuestion)", async () => {
      const formReturningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);

      const formValuesMock = vi.fn(() => ({ returning: formReturningMock }));
      const questionValuesMock = vi.fn().mockResolvedValue(undefined);

      // route inserts twice: once for form, once for formQuestion
      (db.insert as Mock).mockImplementation(
        (table: typeof form | typeof formQuestion) => {
          if (table === form) return { values: formValuesMock };
          if (table === formQuestion) return { values: questionValuesMock };
          throw new Error("unexpected table");
        },
      );

      const result = await createForm({
        seasonCode: "S26",
        questions: [
          { formQuestionId: "q1", questionType: "text", tags: ["required"] },
          { formQuestionId: "q2", questionType: "number" },
        ],
      });

      expect(result.formId).toBe(FORM_ID);
      expect(db.insert).toHaveBeenCalledWith(form);
      expect(db.insert).toHaveBeenCalledWith(formQuestion);

      expect(questionValuesMock).toHaveBeenCalledWith([
        {
          formQuestionId: "q1",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "text",
          tags: ["required"],
        },
        {
          formQuestionId: "q2",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "number",
          tags: [],
        },
      ]);
    });

    it("throws ApiError on db error", async () => {
      const returningMock = vi.fn().mockRejectedValue(new Error("db failed"));
      const valuesMock = vi.fn(() => ({ returning: returningMock }));
      (db.insert as Mock).mockReturnValue({ values: valuesMock });

      await expect(createForm({ seasonCode: "S26" })).rejects.toBeInstanceOf(
        ApiError,
      );
    });
  });

  describe("updateForm", () => {
    it("throws 404 if form does not exist", async () => {
      // select().from().where() -> []
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      await expect(
        updateForm({ seasonCode: "S26", formId: FORM_ID, tags: ["x"] }),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it("updates form fields and leaves questions unchanged when questions omitted", async () => {
      // exists check
      const existsWhereMock = vi.fn().mockResolvedValue([{ formId: FORM_ID }]);
      const existsFromMock = vi.fn(() => ({ where: existsWhereMock }));
      (db.select as Mock).mockReturnValue({ from: existsFromMock });

      // update().set().where().returning()
      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: ["updated"],
        },
      ]);
      const updateWhereMock = vi.fn(() => ({ returning: returningMock }));
      const setMock = vi.fn(() => ({ where: updateWhereMock }));
      (db.update as Mock).mockReturnValue({ set: setMock });

      const result = await updateForm({
        seasonCode: "S26",
        formId: FORM_ID,
        tags: ["updated"],
      });

      expect(result).toEqual({
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["updated"],
      });

      // No question deletes/inserts should happen
      expect(db.delete).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalledWith(formQuestion);
    });

    it("replaces questions when questions provided (delete existing then insert new)", async () => {
      // exists check
      const existsWhereMock = vi.fn().mockResolvedValue([{ formId: FORM_ID }]);
      const existsFromMock = vi.fn(() => ({ where: existsWhereMock }));
      (db.select as Mock).mockReturnValue({ from: existsFromMock });

      // update returning
      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);
      const updateWhereMock = vi.fn(() => ({ returning: returningMock }));
      const setMock = vi.fn(() => ({ where: updateWhereMock }));
      (db.update as Mock).mockReturnValue({ set: setMock });

      // delete(formQuestion).where(...)
      const qWhereMock = vi.fn().mockResolvedValue(undefined);
      (db.delete as Mock).mockReturnValue({ where: qWhereMock });

      // insert(formQuestion).values(...)
      const qValuesMock = vi.fn().mockResolvedValue(undefined);
      (db.insert as Mock).mockImplementation((table: typeof formQuestion) => {
        if (table === formQuestion) return { values: qValuesMock };
        throw new Error("unexpected insert table in this test");
      });

      await updateForm({
        seasonCode: "S26",
        formId: FORM_ID,
        questions: [{ formQuestionId: "q1", questionType: "text" }],
      });

      expect(db.delete).toHaveBeenCalledWith(formQuestion);
      expect(qValuesMock).toHaveBeenCalledWith([
        {
          formQuestionId: "q1",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "text",
          tags: [],
        },
      ]);
    });
  });

  describe("deleteForm", () => {
    it("throws 404 if form does not exist", async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      await expect(deleteForm("S26", FORM_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("deletes questions then deletes form", async () => {
      // exists check
      const whereMock = vi.fn().mockResolvedValue([{ formId: FORM_ID }]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      const whereDeleteMock = vi.fn().mockResolvedValue(undefined);
      (db.delete as Mock).mockReturnValue({ where: whereDeleteMock });

      await expect(deleteForm("S26", FORM_ID)).resolves.toBeUndefined();

      // Called twice: first formQuestion, then form
      expect((db.delete as Mock).mock.calls[0][0]).toBe(formQuestion);
      expect((db.delete as Mock).mock.calls[1][0]).toBe(form);
    });
  });

  describe("cloneForm", () => {
    it("throws 404 if source form not found", async () => {
      // first select()...from(form)...where(...) returns []
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      await expect(cloneForm("S26", FORM_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("clones form and clones questions (new formId)", async () => {
      // 1) select src form
      const formWhereMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formFromMock = vi.fn(() => ({ where: formWhereMock }));

      // 2) select src questions
      const qWhereMock = vi.fn().mockResolvedValue([
        {
          formQuestionId: "qOld1",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "text",
          tags: ["a"],
        },
      ]);
      const qFromMock = vi.fn(() => ({ where: qWhereMock }));

      // db.select used twice; return different builders in order
      (db.select as Mock)
        .mockReturnValueOnce({ from: formFromMock })
        .mockReturnValueOnce({ from: qFromMock });

      // insert cloned form returning
      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID_2,
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formValuesMock = vi.fn(() => ({ returning: returningMock }));

      // insert cloned questions
      const qValuesInsertMock = vi.fn().mockResolvedValue(undefined);

      (db.insert as Mock).mockImplementation(
        (table: typeof form | typeof formQuestion) => {
          if (table === form) return { values: formValuesMock };
          if (table === formQuestion) return { values: qValuesInsertMock };
          throw new Error("unexpected table");
        },
      );

      // mock crypto.randomUUID so test is deterministic
      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
        "new-q-id-0000-0000-0000-000000000000" as `${string}-${string}-${string}-${string}-${string}`,
      );

      const result = await cloneForm("S26", FORM_ID);

      expect(result.formId).toBe(FORM_ID_2);

      expect(db.insert).toHaveBeenCalledWith(form);
      expect(db.insert).toHaveBeenCalledWith(formQuestion);

      expect(qValuesInsertMock).toHaveBeenCalledWith([
        {
          formQuestionId: "new-q-id",
          formId: FORM_ID_2,
          seasonCode: "S26",
          questionType: "text",
          tags: ["a"],
        },
      ]);
    });
  });
});
