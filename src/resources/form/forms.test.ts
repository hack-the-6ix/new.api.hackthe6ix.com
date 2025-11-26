import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createForm } from "@/resources/form/forms.service";
import { db } from "@/db";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";
import { form } from "@/db/schema/form";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema/form", () => ({
  form: {},
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  getDbErrorMessage: vi.fn(),
}));

describe("createForm", () => {
  let insertMock: Mock;
  let valuesMock: Mock;
  let returningMock: Mock;

  beforeEach(() => {
    returningMock = vi.fn();
    valuesMock = vi.fn(() => ({ returning: returningMock }));
    insertMock = vi.fn(() => ({ values: valuesMock }));
    (db.insert as Mock) = insertMock;
    vi.clearAllMocks();
  });

  it("creates a form successfully", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    };
    returningMock.mockResolvedValue([mockForm]);

    // exercise
    const result = await createForm({
      seasonCode: "S26",
      tags: ["registration"],
    });

    // verify
    expect(result).toEqual(mockForm);
    expect(insertMock).toHaveBeenCalledWith(form);
    expect(valuesMock).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    });
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
    returningMock.mockResolvedValue([mockForm]);

    // exercise
    const result = await createForm({
      seasonCode: "S26",
      openTime,
      closeTime,
    });

    // verify
    expect(result).toEqual(mockForm);
    expect(valuesMock).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime,
      closeTime,
      tags: [],
    });
  });

  it("throws wrapped db error", async () => {
    // setup
    const error = new Error("db failed");
    returningMock.mockRejectedValue(error);
    (getDbErrorMessage as Mock).mockReturnValue({
      message: "DB_BAD",
    });

    // exercise & verify
    await expect(
      createForm({
        seasonCode: "S26",
      }),
    ).rejects.toThrow("DB_BAD");
  });
});
