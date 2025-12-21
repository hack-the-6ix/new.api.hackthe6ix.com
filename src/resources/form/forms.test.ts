import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock env first before any imports that might use it
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

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  form: {},
  formQuestion: {},
}));

import { ApiError } from "@/lib/errors";

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn((error) => {
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
import { createForm } from "@/resources/form/forms.service";

describe("createForm", () => {
  let formInsertMock: Mock;
  let formValuesMock: Mock;
  let formReturningMock: Mock;
  let questionInsertMock: Mock;
  let questionValuesMock: Mock;

  beforeEach(() => {
    formReturningMock = vi.fn();
    formValuesMock = vi.fn(() => ({ returning: formReturningMock }));
    formInsertMock = vi.fn(() => ({ values: formValuesMock }));
    questionValuesMock = vi.fn();
    questionInsertMock = vi.fn(() => ({ values: questionValuesMock }));
    (db.insert as Mock) = formInsertMock;
    vi.clearAllMocks();
    // Reset the mock implementation
    formReturningMock.mockClear();
    formValuesMock.mockClear();
    formInsertMock.mockClear();
  });

  it("creates a form successfully without questions", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    };
    formReturningMock.mockResolvedValue([mockForm]);

    // exercise
    const result = await createForm({
      seasonCode: "S26",
      tags: ["registration"],
    });

    // verify
    expect(result).toEqual(mockForm);
    expect(formInsertMock).toHaveBeenCalledWith(form);
    expect(formValuesMock).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    });
    expect(questionInsertMock).not.toHaveBeenCalled();
  });

  it("creates a form with openTime and closeTime", async () => {
    // setup
    const openTime = new Date("2024-01-01T00:00:00Z");
    const closeTime = new Date("2024-01-31T23:59:59Z");
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime,
      closeTime,
      tags: [],
    };
    formReturningMock.mockResolvedValue([mockForm]);

    // exercise
    const result = await createForm({
      seasonCode: "S26",
      openTime,
      closeTime,
    });

    // verify
    expect(result).toEqual(mockForm);
    expect(formValuesMock).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime,
      closeTime,
      tags: [],
    });
  });

  it("creates a form with questions", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: [],
    };
    formReturningMock.mockResolvedValue([mockForm]);
    // Setup mock to handle both form and formQuestion inserts
    (db.insert as Mock) = vi.fn((table) => {
      if (table === form) {
        return { values: formValuesMock };
      }
      if (table === formQuestion) {
        return { values: questionValuesMock };
      }
      return { values: vi.fn() };
    });

    // exercise
    const result = await createForm({
      seasonCode: "S26",
      questions: [
        {
          formQuestionId: "q1",
          questionType: "text",
          tags: ["required"],
        },
        {
          formQuestionId: "q2",
          questionType: "number",
        },
      ],
    });

    // verify
    expect(result).toEqual(mockForm);
    expect(db.insert).toHaveBeenCalledWith(form);
    expect(db.insert).toHaveBeenCalledWith(formQuestion);
    expect(questionValuesMock).toHaveBeenCalledWith([
      {
        formQuestionId: "q1",
        formId: "form-123",
        seasonCode: "S26",
        questionType: "text",
        tags: ["required"],
      },
      {
        formQuestionId: "q2",
        formId: "form-123",
        seasonCode: "S26",
        questionType: "number",
        tags: [],
      },
    ]);
  });

  it("throws ApiError on database error", async () => {
    // setup
    const error = new Error("db failed");
    formReturningMock.mockRejectedValue(error);

    // exercise & verify
    await expect(
      createForm({
        seasonCode: "S26",
      }),
    ).rejects.toThrow(ApiError);
  });
});
