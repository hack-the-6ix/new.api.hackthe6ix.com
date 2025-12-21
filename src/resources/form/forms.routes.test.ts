import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { Hono } from "hono";
import formsRoute from "@/resources/form/forms.routes";
import { createForm } from "@/resources/form/forms.service";
import { isAdmin } from "@/lib/auth";
import { ApiError, handleError } from "@/lib/errors";

// Suppress console.error for cleaner test output
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

vi.mock("@/resources/form/forms.service", () => ({
  createForm: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

describe("POST /seasons/:seasonCode/forms", () => {
  let app: Hono;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    app = new Hono();
    app.onError(handleError);
    app.route("/", formsRoute);
    vi.clearAllMocks();
    (isAdmin as Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns 201 with form data on success", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    };
    (createForm as Mock).mockResolvedValue(mockForm);

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: "admin-token",
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual({
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
    });
    expect(createForm).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: ["registration"],
      questions: [],
    });
  });

  it("creates form with questions", async () => {
    // setup
    const mockForm = {
      formId: "form-123",
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: [],
    };
    (createForm as Mock).mockResolvedValue(mockForm);

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: "admin-token",
        questions: [
          {
            formQuestionId: "q1",
            questionType: "text",
            tags: ["required"],
          },
        ],
      }),
    });

    // verify
    expect(res.status).toBe(201);
    expect(createForm).toHaveBeenCalledWith({
      seasonCode: "S26",
      openTime: null,
      closeTime: null,
      tags: [],
      questions: [
        {
          formQuestionId: "q1",
          questionType: "text",
          tags: ["required"],
        },
      ],
    });
  });

  it("returns 403 when user is not admin", async () => {
    // setup
    (isAdmin as Mock).mockResolvedValue(false);

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: "user-token",
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error[0].code).toBe("FORBIDDEN");
  });

  it("returns error when createForm throws ApiError", async () => {
    // setup
    const apiError = new ApiError(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid form data",
    });
    (createForm as Mock).mockRejectedValue(apiError);

    // exercise
    const res = await app.request("/seasons/S26/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: "admin-token",
        tags: ["registration"],
      }),
    });

    // verify
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error[0].code).toBe("VALIDATION_ERROR");
  });
});
