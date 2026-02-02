import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { handleDbError } from "@/db/utils/dbErrorUtils";

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

vi.mock("@/db", () => {
  // one shared set of mocks used both by db.* and tx.*
  const insert = vi.fn();
  const select = vi.fn();
  const update = vi.fn();
  const del = vi.fn();

  return {
    db: {
      insert,
      select,
      update,
      delete: del,
      // transaction calls the callback with an object that uses
      transaction: vi.fn(
        async (
          fn: (tx: {
            insert: typeof insert;
            select: typeof select;
            update: typeof update;
            delete: typeof del;
          }) => Promise<unknown>,
        ) => {
          return fn({ insert, select, update, delete: del });
        },
      ),
    },
  };
});

vi.mock("@/db/schema", () => ({
  form: { formId: "form.formId", seasonCode: "form.seasonCode" },
  formQuestion: {
    formId: "formQuestion.formId",
    seasonCode: "formQuestion.seasonCode",
  },
}));

vi.mock("@/lib/auth", () => ({
  isUserType: vi.fn(),
  getUserId: vi.fn(),
  requireRoles: vi.fn(),
  UserType: {
    User: "user",
    Public: "public",
    Admin: "admin",
    Hacker: "hacker",
    Sponsor: "sponsor",
    Mentor: "mentor",
    Volunteer: "volunteer",
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
  getAllForms,
  getForms,
} from "@/resources/form/forms.service";

const FORM_ID = "019b4d85-4bd6-74b3-9485-88343744d21c";
const FORM_ID_2 = "019b4d79-2623-79e4-8615-e46f1ac64125";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("forms.service", () => {
  describe("getAllForms", () => {
    let selectMock: Mock;
    let fromMock: Mock;
    let whereMock: Mock;

    beforeEach(() => {
      whereMock = vi.fn();
      fromMock = vi.fn(() => ({ where: whereMock }));
      selectMock = vi.fn(() => ({ from: fromMock }));
      (db.select as Mock) = selectMock;
      vi.clearAllMocks();
    });

    it("returns all forms for a season", async () => {
      // setup
      const mockForms = [
        {
          formId: "form-1",
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ];
      whereMock.mockResolvedValue(mockForms);

      // exercise
      const result = await getAllForms("S26");

      // verify
      expect(result).toEqual(mockForms);
      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(form);
      expect(whereMock).toHaveBeenCalled();
    });

    it("returns empty array when no forms exist", async () => {
      // setup
      whereMock.mockResolvedValue([]);

      // exercise
      const result = await getAllForms("S26");

      // verify
      expect(result).toEqual([]);
    });

    it("throws wrapped db error on failure", async () => {
      // setup
      const dbError = new Error("db failed");
      const apiError = new Error("DB_ERROR");
      whereMock.mockRejectedValue(dbError);
      (handleDbError as Mock).mockReturnValue(apiError);

      // exercise & verify
      await expect(getAllForms("S26")).rejects.toThrow("DB_ERROR");
      expect(handleDbError).toHaveBeenCalledWith(dbError);
    });
  });

  describe("getForms", () => {
    let selectMock: Mock;
    let fromMock: Mock;
    let whereMock: Mock;
    let limitMock: Mock;

    beforeEach(() => {
      limitMock = vi.fn();
      whereMock = vi.fn(() => ({ limit: limitMock }));
      fromMock = vi.fn(() => ({ where: whereMock }));
      selectMock = vi.fn(() => ({ from: fromMock }));
      (db.select as Mock) = selectMock;
      vi.clearAllMocks();
    });

    it("returns form with questions when form exists", async () => {
      // setup
      const mockForm = {
        formId: "form-1",
        seasonCode: "S26",
      };

      const mockQuestions = [
        {
          questionId: "q-1",
          formId: "form-1",
          seasonCode: "S26",
          prompt: "Why?",
        },
      ];

      // form
      limitMock.mockResolvedValue([mockForm]);

      // questions
      const questionWhereMock = vi.fn().mockResolvedValue(mockQuestions);
      const questionFromMock = vi.fn(() => ({ where: questionWhereMock }));

      (db.select as Mock)
        .mockReturnValueOnce({ from: fromMock }) // form query
        .mockReturnValueOnce({ from: questionFromMock }); // questions query

      // exercise
      const result = await getForms("S26", "form-1");

      // verify
      expect(result).toEqual({
        ...mockForm,
        questions: mockQuestions,
      });
    });

    it("returns null when form does not exist", async () => {
      // setup
      limitMock.mockResolvedValue([]);

      // exercise
      const result = await getForms("S26", "form-1");

      // verify
      expect(result).toBeNull();
    });

    it("throws wrapped db error on failure", async () => {
      // setup
      const dbError = new Error("query failed");
      const apiError = new Error("DB_QUERY_ERROR");

      limitMock.mockRejectedValue(dbError);
      (handleDbError as Mock).mockReturnValue(apiError);

      // exercise & verify
      await expect(getForms("S26", "form-1")).rejects.toThrow("DB_QUERY_ERROR");
      expect(handleDbError).toHaveBeenCalledWith(dbError);
    });
  });

  describe("createForm", () => {
    it("creates a form successfully without questions", async () => {
      const mockForm = {
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
      };

      const returningMock = vi.fn().mockResolvedValue([mockForm]);
      const valuesMock = vi.fn(() => ({ returning: returningMock }));
      (db.insert as Mock).mockReturnValue({ values: valuesMock });

      const result = await createForm({
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
      });

      expect(result).toEqual(mockForm);
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
        openTime: null,
        closeTime: null,
        questions: [
          { formQuestionRef: "q1", questionType: "text", tags: ["required"] },
          { formQuestionRef: "q2", questionType: "number" },
        ],
      });

      expect(result.formId).toBe(FORM_ID);
      expect(db.insert).toHaveBeenCalledWith(form);
      expect(db.insert).toHaveBeenCalledWith(formQuestion);

      expect(questionValuesMock).toHaveBeenCalledWith([
        {
          formQuestionRef: "q1",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "text",
          tags: ["required"],
        },
        {
          formQuestionRef: "q2",
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

      await expect(
        createForm({ seasonCode: "S26", openTime: null, closeTime: null }),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("updateForm", () => {
    it("throws 404 if form does not exist", async () => {
      // select().from().where() -> []
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      await expect(
        updateForm({
          seasonCode: "S26",
          openTime: null,
          closeTime: null,
          formId: FORM_ID,
          tags: ["x"],
        }),
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
        openTime: null,
        closeTime: null,
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
        openTime: null,
        closeTime: null,
        formId: FORM_ID,
        questions: [{ formQuestionRef: "q1", questionType: "text" }],
      });

      expect(db.delete).toHaveBeenCalledWith(formQuestion);
      expect(qValuesMock).toHaveBeenCalledWith([
        {
          formQuestionRef: "q1",
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

    it("deletes form", async () => {
      // exists check
      const whereMock = vi.fn().mockResolvedValue([{ formId: FORM_ID }]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      const whereDeleteMock = vi.fn().mockResolvedValue(undefined);
      (db.delete as Mock).mockReturnValue({ where: whereDeleteMock });

      await expect(deleteForm("S26", FORM_ID)).resolves.toBeUndefined();

      expect((db.delete as Mock).mock.calls.length).toBe(1);
      expect((db.delete as Mock).mock.calls[0][0]).toBe(form);
      expect(whereDeleteMock).toHaveBeenCalled();
    });
  });
  describe("cloneForm", () => {
    it("throws 404 if source form not found", async () => {
      const whereMock = vi.fn().mockResolvedValue([]);
      const fromMock = vi.fn(() => ({ where: whereMock }));
      (db.select as Mock).mockReturnValue({ from: fromMock });

      await expect(cloneForm("S26", FORM_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("clones form with same question refs and no custom formName", async () => {
      const formWhereMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          formName: "Original Form",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formFromMock = vi.fn(() => ({ where: formWhereMock }));

      const qWhereMock = vi.fn().mockResolvedValue([
        {
          formQuestionRef: "qOld1",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "text",
          tags: ["a"],
        },
        {
          formQuestionRef: "qOld2",
          formId: FORM_ID,
          seasonCode: "S26",
          questionType: "number",
          tags: ["b"],
        },
      ]);
      const qFromMock = vi.fn(() => ({ where: qWhereMock }));

      (db.select as Mock)
        .mockReturnValueOnce({ from: formFromMock })
        .mockReturnValueOnce({ from: qFromMock });

      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID_2,
          seasonCode: "S26",
          formName: "Original Form",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formValuesMock = vi.fn(() => ({ returning: returningMock }));

      const qValuesInsertMock = vi.fn().mockResolvedValue(undefined);

      (db.insert as Mock).mockImplementation(
        (table: typeof form | typeof formQuestion) => {
          if (table === form) return { values: formValuesMock };
          if (table === formQuestion) return { values: qValuesInsertMock };
          throw new Error("unexpected table");
        },
      );

      const result = await cloneForm("S26", FORM_ID);

      expect(result.formId).toBe(FORM_ID_2);
      expect(result.formName).toBe("Original Form");

      expect(db.insert).toHaveBeenCalledWith(form);
      expect(db.insert).toHaveBeenCalledWith(formQuestion);

      // Now expecting SAME question refs (no timestamps)
      expect(qValuesInsertMock).toHaveBeenCalledWith([
        {
          formQuestionRef: "qOld1", // Same ref
          formId: FORM_ID_2,
          seasonCode: "S26",
          questionType: "text",
          tags: ["a"],
        },
        {
          formQuestionRef: "qOld2", // Same ref
          formId: FORM_ID_2,
          seasonCode: "S26",
          questionType: "number",
          tags: ["b"],
        },
      ]);
    });

    it("clones form with custom formName when provided", async () => {
      const formWhereMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          formName: "Original Form",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formFromMock = vi.fn(() => ({ where: formWhereMock }));

      const qWhereMock = vi.fn().mockResolvedValue([]); // No questions
      const qFromMock = vi.fn(() => ({ where: qWhereMock }));

      (db.select as Mock)
        .mockReturnValueOnce({ from: formFromMock })
        .mockReturnValueOnce({ from: qFromMock });

      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID_2,
          seasonCode: "S26",
          formName: "Custom Cloned Name",
          openTime: null,
          closeTime: null,
          tags: ["registration"],
        },
      ]);
      const formValuesMock = vi.fn(() => ({ returning: returningMock }));

      (db.insert as Mock).mockReturnValue({ values: formValuesMock });

      const result = await cloneForm("S26", FORM_ID, "Custom Cloned Name");

      expect(result.formName).toBe("Custom Cloned Name");
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it("clones form with null formName when original is null", async () => {
      const formWhereMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          formName: null,
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);
      const formFromMock = vi.fn(() => ({ where: formWhereMock }));

      const qWhereMock = vi.fn().mockResolvedValue([]);
      const qFromMock = vi.fn(() => ({ where: qWhereMock }));

      (db.select as Mock)
        .mockReturnValueOnce({ from: formFromMock })
        .mockReturnValueOnce({ from: qFromMock });

      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID_2,
          seasonCode: "S26",
          formName: null,
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);
      const formValuesMock = vi.fn(() => ({ returning: returningMock }));

      (db.insert as Mock).mockReturnValue({ values: formValuesMock });

      const result = await cloneForm("S26", FORM_ID);
      expect(result.formName).toBeNull();
    });

    it("clones form without questions when source has no questions", async () => {
      const formWhereMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID,
          seasonCode: "S26",
          formName: "Empty Form",
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);
      const formFromMock = vi.fn(() => ({ where: formWhereMock }));

      const qWhereMock = vi.fn().mockResolvedValue([]);
      const qFromMock = vi.fn(() => ({ where: qWhereMock }));

      (db.select as Mock)
        .mockReturnValueOnce({ from: formFromMock })
        .mockReturnValueOnce({ from: qFromMock });

      const returningMock = vi.fn().mockResolvedValue([
        {
          formId: FORM_ID_2,
          seasonCode: "S26",
          formName: "Empty Form",
          openTime: null,
          closeTime: null,
          tags: [],
        },
      ]);
      const formValuesMock = vi.fn(() => ({ returning: returningMock }));

      (db.insert as Mock).mockReturnValue({ values: formValuesMock });

      const result = await cloneForm("S26", FORM_ID);
      expect(result.formId).toBe(FORM_ID_2);
      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });
});
