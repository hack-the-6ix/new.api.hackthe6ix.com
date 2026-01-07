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
import { Context } from "hono";

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
  dev: false,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }),
    ),
  },
}));

vi.mock("@/db/schema", () => ({}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
  and: vi.fn((...conditions) => ({ conditions, type: "and" })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: "sql" })),
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isUserType: vi.fn(),
  getUserId: vi.fn().mockResolvedValue("admin-user-id"),
  requireRoles: vi.fn(() => {
    // middleware that just calls next()
    return async (c: Context, next: () => Promise<void>) => {
      await next();
    };
  }),
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

// Mock form service methods used by routes
vi.mock("@/resources/form/forms.service", () => ({
  createForm: vi.fn(),
  updateForm: vi.fn(),
  deleteForm: vi.fn(),
  cloneForm: vi.fn(),
}));

// ---- actual imports AFTER mocks ----
import formsRoute from "@/resources/form/forms.routes";
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
} from "@/resources/form/forms.service";
import { ApiError, handleError } from "@/lib/errors";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function makeApp() {
  const app = new Hono();
  app.onError(handleError);
  app.route("/", formsRoute);
  return app;
}

const FORM_ID = "019b4d85-4bd6-74b3-9485-88343744d21c";
const CLONED_ID = "019b4d79-2623-79e4-8615-e46f1ac64125";

describe("Forms routes", () => {
  let app: Hono;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    app = makeApp();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("POST /seasons/:seasonCode/forms", () => {
    it("returns 201 with form data on success", async () => {
      const mockForm = {
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
      };
      (createForm as Mock).mockResolvedValue(mockForm);

      const res = await app.request("/seasons/S26/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: ["registration"],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(mockForm);

      expect(createForm).toHaveBeenCalledWith({
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration"],
        questions: [],
      });
    });

    it("creates form with questions", async () => {
      const mockForm = {
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: [],
      };
      (createForm as Mock).mockResolvedValue(mockForm);

      const res = await app.request("/seasons/S26/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: [
            { formQuestionId: "q1", questionType: "text", tags: ["required"] },
          ],
        }),
      });

      expect(res.status).toBe(201);
      expect(createForm).toHaveBeenCalledWith({
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: [],
        questions: [
          { formQuestionId: "q1", questionType: "text", tags: ["required"] },
        ],
      });
    });

    it("returns error when createForm throws ApiError", async () => {
      const apiError = new ApiError(400, {
        code: "VALIDATION_ERROR",
        message: "Invalid form data",
      });
      (createForm as Mock).mockRejectedValue(apiError);

      const res = await app.request("/seasons/S26/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: ["registration"],
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/clone", () => {
    it("returns 201 with cloned form on success", async () => {
      const mockCloned = {
        formId: CLONED_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
      };
      (cloneForm as Mock).mockResolvedValue(mockCloned);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual(mockCloned);
      expect(cloneForm).toHaveBeenCalledWith("S26", FORM_ID);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId (update)", () => {
    it("returns 200 with updated form on success", async () => {
      const updatedMock = {
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
      };
      (updateForm as Mock).mockResolvedValue(updatedMock);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: ["registration", "updated"],
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(updatedMock);

      expect(updateForm).toHaveBeenCalledWith({
        seasonCode: "S26",
        formId: FORM_ID,
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
        questions: undefined,
      });
    });
  });

  describe("DELETE /seasons/:seasonCode/forms/:formId", () => {
    it("returns 204 and deletes form on success", async () => {
      (deleteForm as Mock).mockResolvedValue(undefined);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
      expect(deleteForm).toHaveBeenCalledWith("S26", FORM_ID);
    });
  });
});
