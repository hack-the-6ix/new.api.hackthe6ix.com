import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { form } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { ApiError } from "@/lib/errors";
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
  getAllForms,
  getForms,
} from "@/resources/form/forms.service";

// --- Mocks ---

vi.mock("@/config/env", () => ({
  default: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
}));

// Strictly type the database mocks using ReturnType and vi.mocked
vi.mock("@/db", () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  const mockDb = {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      // We pass the same mock structure as the transaction object
      return callback({
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate,
        delete: mockDelete,
      });
    }),
  };

  return { db: mockDb };
});

vi.mock("@/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/schema")>();
  return {
    ...actual,
    form: {
      ...actual.form,
      formId: "form.formId",
      seasonCode: "form.seasonCode",
    },
    formQuestion: {
      ...actual.formQuestion,
      formId: "formQuestion.formId",
      seasonCode: "formQuestion.seasonCode",
    },
  };
});

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn((error: unknown) => {
    if (error instanceof ApiError) return error;
    return new ApiError(500, {
      code: "DATABASE_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }),
}));

// --- Test Suite ---

const FORM_ID = "019b4d85-4bd6-74b3-9485-88343744d21c";
const FORM_ID_2 = "019b4d79-2623-79e4-8615-e46f1ac64125";

// Helper to create the fluent chain without using 'any'
// We use 'unknown' as a bridge to the Drizzle ReturnTypes
const mockChain = <T>(value: T) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(value),
  // Handle the direct await (thenable)
  then: (onfulfilled?: (value: T) => void) =>
    Promise.resolve(value).then(onfulfilled),
});

describe("forms.service", () => {
  const mockedDb = vi.mocked(db);
  const mockedErrorHandler = vi.mocked(handleDbError);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllForms", () => {
    it("returns all forms for a season", async () => {
      const mockForms = [{ formId: "f1", seasonCode: "S26" }];
      mockedDb.select.mockReturnValue(
        mockChain(mockForms) as unknown as ReturnType<typeof db.select>,
      );

      const result = await getAllForms("S26");

      expect(result).toEqual(mockForms);
      expect(mockedDb.select).toHaveBeenCalled();
    });

    it("throws wrapped db error on failure", async () => {
      const dbError = new Error("db failed");

      mockedDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(dbError),
      } as unknown as ReturnType<typeof db.select>);

      await expect(getAllForms("S26")).rejects.toThrow();
      expect(mockedErrorHandler).toHaveBeenCalledWith(dbError);
    });
  });

  describe("getForms", () => {
    it("returns form with questions when form exists", async () => {
      const mockForm = { formId: "f1", seasonCode: "S26" };
      const mockQuestions = [{ questionId: "q1" }];

      mockedDb.select
        .mockReturnValueOnce(
          mockChain([mockForm]) as unknown as ReturnType<typeof db.select>,
        )
        .mockReturnValueOnce(
          mockChain(mockQuestions) as unknown as ReturnType<typeof db.select>,
        );

      const result = await getForms("S26", "f1");

      expect(result).toEqual({ ...mockForm, questions: mockQuestions });
    });
  });

  describe("createForm", () => {
    it("creates a form successfully", async () => {
      const mockForm = { formId: FORM_ID, seasonCode: "S26" };
      mockedDb.insert.mockReturnValue(
        mockChain([mockForm]) as unknown as ReturnType<typeof db.insert>,
      );

      const result = await createForm({
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
      });

      expect(result).toEqual(mockForm);
      expect(mockedDb.insert).toHaveBeenCalledWith(form);
    });

    it("throws ApiError on db error", async () => {
      mockedDb.insert.mockImplementation(() => {
        throw new Error("db failed");
      });

      await expect(
        createForm({ seasonCode: "S26", openTime: null, closeTime: null }),
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("updateForm", () => {
    it("throws 404 if form does not exist", async () => {
      // Mock select finding nothing
      mockedDb.select.mockReturnValue(
        mockChain([]) as unknown as ReturnType<typeof db.select>,
      );

      await expect(
        updateForm({
          seasonCode: "S26",
          formId: FORM_ID,
          openTime: null,
          closeTime: null,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("updates form successfully", async () => {
      const updatedForm = { formId: FORM_ID, tags: ["updated"] };
      mockedDb.select.mockReturnValue(
        mockChain([updatedForm]) as unknown as ReturnType<typeof db.select>,
      );
      mockedDb.update.mockReturnValue(
        mockChain([updatedForm]) as unknown as ReturnType<typeof db.update>,
      );

      const result = await updateForm({
        seasonCode: "S26",
        formId: FORM_ID,
        openTime: null,
        closeTime: null,
        tags: ["updated"],
      });

      expect(result).toEqual(updatedForm);
    });
  });

  describe("deleteForm", () => {
    it("deletes form successfully", async () => {
      mockedDb.select.mockReturnValue(
        mockChain([{ id: 1 }]) as unknown as ReturnType<typeof db.select>,
      );
      mockedDb.delete.mockReturnValue(
        mockChain(undefined) as unknown as ReturnType<typeof db.delete>,
      );

      await expect(deleteForm("S26", FORM_ID)).resolves.toBeUndefined();
      expect(mockedDb.delete).toHaveBeenCalledWith(form);
    });
  });

  describe("cloneForm", () => {
    it("clones form with questions", async () => {
      const srcForm = { formId: FORM_ID, seasonCode: "S26", formName: "Orig" };
      const clonedForm = {
        formId: FORM_ID_2,
        seasonCode: "S26",
        formName: "Orig",
      };

      // 1. Select form, 2. Select questions
      mockedDb.select
        .mockReturnValueOnce(
          mockChain([srcForm]) as unknown as ReturnType<typeof db.select>,
        )
        .mockReturnValueOnce(
          mockChain([]) as unknown as ReturnType<typeof db.select>,
        );

      mockedDb.insert.mockReturnValue(
        mockChain([clonedForm]) as unknown as ReturnType<typeof db.insert>,
      );

      const result = await cloneForm("S26", FORM_ID);
      expect(result.formId).toBe(FORM_ID_2);
    });
  });
});
