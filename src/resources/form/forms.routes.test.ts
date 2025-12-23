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
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
} from "@/resources/form/forms.service";
import { isAdmin } from "@/lib/auth";
import { ApiError, handleError } from "@/lib/errors";

// Suppress console.error for cleaner test output
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

// ✅ mock all service funcs used by routes
vi.mock("@/resources/form/forms.service", () => ({
  createForm: vi.fn(),
  updateForm: vi.fn(),
  deleteForm: vi.fn(),
  cloneForm: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

function makeApp() {
  const app = new Hono();
  app.onError(handleError);
  app.route("/", formsRoute);
  return app;
}

// Use valid UUIDs because routes validate z.string().uuid()
const FORM_ID = "019b4d85-4bd6-74b3-9485-88343744d21c";
const CLONED_ID = "019b4d79-2623-79e4-8615-e46f1ac64125";

describe("Forms routes", () => {
  let app: Hono;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    app = makeApp();
    vi.clearAllMocks();
    (isAdmin as Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
          sessionToken: "admin-token",
          tags: ["registration"],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual({
        formId: FORM_ID,
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
          sessionToken: "admin-token",
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

    it("returns 403 when user is not admin", async () => {
      (isAdmin as Mock).mockResolvedValue(false);

      const res = await app.request("/seasons/S26/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: "user-token",
          tags: ["registration"],
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("FORBIDDEN");
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
          sessionToken: "admin-token",
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
        body: JSON.stringify({ sessionToken: "admin-token" }),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        formId: CLONED_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
      });

      expect(cloneForm).toHaveBeenCalledWith("S26", FORM_ID);
    });

    it("returns 403 when user is not admin", async () => {
      (isAdmin as Mock).mockResolvedValue(false);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: "user-token" }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("FORBIDDEN");
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
          sessionToken: "admin-token",
          tags: ["registration", "updated"],
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        formId: FORM_ID,
        seasonCode: "S26",
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
      });

      expect(updateForm).toHaveBeenCalledWith({
        seasonCode: "S26",
        formId: FORM_ID,
        openTime: null,
        closeTime: null,
        tags: ["registration", "updated"],
        questions: undefined, // omitted => leave unchanged
      });
    });

    it("returns 403 when user is not admin", async () => {
      (isAdmin as Mock).mockResolvedValue(false);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: "user-token", tags: ["x"] }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("FORBIDDEN");
    });
  });

  describe("DELETE /seasons/:seasonCode/forms/:formId", () => {
    it("returns 204 and deletes form on success", async () => {
      (deleteForm as Mock).mockResolvedValue(undefined);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: "admin-token" }),
      });

      expect(res.status).toBe(204);
      // 204 should not have JSON; safest check is empty text
      expect(await res.text()).toBe("");

      expect(deleteForm).toHaveBeenCalledWith("S26", FORM_ID);
    });

    it("returns 403 when user is not admin", async () => {
      (isAdmin as Mock).mockResolvedValue(false);

      const res = await app.request(`/seasons/S26/forms/${FORM_ID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: "user-token" }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("FORBIDDEN");
    });
  });
});
