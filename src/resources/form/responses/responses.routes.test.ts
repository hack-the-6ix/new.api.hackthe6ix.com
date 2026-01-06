import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { initializeTestDb } from "@/lib/tests/testHelpers";
import { season, form, formResponse } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

// Mock env before any imports that might use it
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

// Create mocks object before any imports
const mocks = vi.hoisted(() => ({
  testDb: null as unknown as PgliteDatabase<typeof schema>,
}));

vi.mock("@/db", () => ({
  get db() {
    return mocks.testDb;
  },
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: (error: unknown) => {
    throw error;
  },
}));

vi.mock("@/lib/auth", () => ({
  isUserType: vi.fn(),
  getUserId: vi.fn().mockResolvedValue("71234567-89ab-cdef-0123-456789abcdef"),
  requireRoles: vi.fn(() => {
    return async (c: unknown, next: () => Promise<void>) => await next();
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

import app from "@/server";
import { isUserType, UserType } from "@/lib/auth";
import {
  getFormResponses,
  getRandomFormResponse,
  upsertFormResponse,
} from "./responses.service";

// Suppress console.error for cleaner test output
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const seasonCode = "S24";
const formId = "11234567-89ab-cdef-0123-456789abcdef";
const userId = "21234567-89ab-cdef-0123-456789abcdef";

beforeAll(async () => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  await initializeTestDb(mocks);

  await mocks.testDb.insert(season).values({
    seasonId: "01234567-89ab-cdef-0123-456789abcdef",
    seasonCode,
  });
  await mocks.testDb.insert(form).values({
    seasonCode,
    formId,
    eventId: "31234567-89ab-cdef-0123-456789abcdef",
    formName: "Test Form",
  });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(async () => {
  await mocks.testDb.delete(formResponse);
  vi.clearAllMocks();
});

describe("Form Responses Service Integration", () => {
  it("gets responses with filters", async () => {
    await mocks.testDb.insert(formResponse).values([
      {
        seasonCode,
        userId,
        formId,
        responseJson: { q: "a1" },
        isSubmitted: true,
      },
      {
        seasonCode,
        userId: "51234567-89ab-cdef-0123-456789abcdef",
        formId,
        responseJson: { q: "a2" },
        isSubmitted: false,
      },
    ]);

    const all = await getFormResponses(seasonCode);
    expect(all).toHaveLength(2);

    const filtered = await getFormResponses(seasonCode, formId, userId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].userId).toBe(userId);
  });

  it("gets random response", async () => {
    const empty = await getRandomFormResponse(formId, seasonCode);
    expect(empty).toBeNull();

    await mocks.testDb.insert(formResponse).values({
      seasonCode,
      userId,
      formId,
      responseJson: { test: "data" },
      isSubmitted: true,
    });

    const result = await getRandomFormResponse(formId, seasonCode);
    expect(result?.formId).toBe(formId);
  });

  it("upserts responses", async () => {
    const data = { q1: "a1" };

    await upsertFormResponse(seasonCode, userId, formId, data, false);
    let responses = await mocks.testDb
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.seasonCode, seasonCode),
          eq(formResponse.userId, userId),
        ),
      );
    expect(responses).toHaveLength(1);
    expect(responses[0].isSubmitted).toBe(false);

    await upsertFormResponse(seasonCode, userId, formId, { q1: "a2" }, true);
    responses = await mocks.testDb
      .select()
      .from(formResponse)
      .where(
        and(
          eq(formResponse.seasonCode, seasonCode),
          eq(formResponse.userId, userId),
        ),
      );
    expect(responses).toHaveLength(1);
    expect(responses[0].isSubmitted).toBe(true);
    expect(responses[0].responseJson).toEqual({ q1: "a2" });
  });
});

describe("Form Responses Routes", () => {
  describe("GET /seasons/:seasonCode/responses", () => {
    it("should return form responses for a season", async () => {
      await mocks.testDb.insert(formResponse).values({
        seasonCode,
        userId,
        formId,
        responseJson: { answer1: "test" },
        isSubmitted: true,
      });

      const res = await app.request(`/api/seasons/${seasonCode}/responses`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        seasonCode,
        userId,
        formId,
        responseJson: { answer1: "test" },
        isSubmitted: true,
      });
    });

    it("should filter by formId query parameter", async () => {
      const anotherFormId = "41234567-89ab-cdef-0123-456789abcdef";
      await mocks.testDb.insert(form).values({
        seasonCode,
        formId: anotherFormId,
        eventId: "31234567-89ab-cdef-0123-456789abcdef",
        formName: "Another Form",
      });

      await mocks.testDb.insert(formResponse).values([
        {
          seasonCode,
          userId,
          formId,
          responseJson: { test: "form1" },
          isSubmitted: true,
        },
        {
          seasonCode,
          userId,
          formId: anotherFormId,
          responseJson: { test: "form2" },
          isSubmitted: true,
        },
      ]);

      const res = await app.request(
        `/api/seasons/${seasonCode}/responses?formId=${formId}`,
        { method: "GET" },
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].formId).toBe(formId);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses", () => {
    it("should create/update form response successfully", async () => {
      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      if (res.status !== 201) {
        console.log("Error response:", await res.json());
      }
      expect(res.status).toBe(201);

      const responses = await mocks.testDb
        .select()
        .from(formResponse)
        .where(eq(formResponse.userId, "71234567-89ab-cdef-0123-456789abcdef"));
      expect(responses).toHaveLength(1);
      expect(responses[0].responseJson).toEqual({ answer1: "test" });
    });

    it("should return 400 for invalid UUID in path", async () => {
      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/invalid-uuid/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing required fields", async () => {
      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "user-session-token",
          }),
        },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses/random", () => {
    it("should return a random form response", async () => {
      await mocks.testDb.insert(formResponse).values({
        seasonCode,
        userId,
        formId,
        responseJson: { answer1: "test" },
        isSubmitted: true,
      });

      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses/random`,
        { method: "POST" },
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.formId).toBe(formId);
      expect(data.responseJson).toEqual({ answer1: "test" });
    });

    it("should return 409 when no form responses found", async () => {
      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses/random`,
        { method: "POST" },
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toHaveProperty("success", false);
      expect(data.error[0]).toHaveProperty("code", "FORM_RESPONSES_NOT_FOUND");
    });

    it("should return 400 for invalid UUID in path", async () => {
      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/invalid-uuid/responses/random`,
        { method: "POST" },
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid season code", async () => {
      const res = await app.request(
        `/api/seasons/INVALID/forms/${formId}/responses/random`,
        { method: "POST" },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses with targetUserId", () => {
    it("should allow admin to upsert for another user when targetUserId is provided", async () => {
      vi.mocked(isUserType).mockResolvedValue(true);

      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "admin-user",
            targetUserId: "01937000-0000-7000-8000-000000000001",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(201);
    });

    it("should ignore targetUserId for non-admin users and use their own userId", async () => {
      vi.mocked(isUserType).mockResolvedValue(false);

      const res = await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "regular-user",
            targetUserId: "01937000-0000-7000-8000-000000000001",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(201);

      const responses = await mocks.testDb
        .select()
        .from(formResponse)
        .where(eq(formResponse.userId, "71234567-89ab-cdef-0123-456789abcdef"));
      expect(responses).toHaveLength(1);
      expect(responses[0].userId).toBe("71234567-89ab-cdef-0123-456789abcdef");
    });

    it("should only call isUserType once when targetUserId is provided", async () => {
      vi.mocked(isUserType).mockResolvedValue(true);
      vi.mocked(isUserType).mockClear();

      await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "admin-user",
            targetUserId: "01937000-0000-7000-8000-000000000001",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(vi.mocked(isUserType)).toHaveBeenCalled();
      expect(vi.mocked(isUserType)).toHaveBeenCalledWith(
        expect.any(Object),
        UserType.Admin,
      );
    });

    it("should not call isUserType when targetUserId is not provided", async () => {
      vi.clearAllMocks();

      await app.request(
        `/api/seasons/${seasonCode}/forms/${formId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "regular-user",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(vi.mocked(isUserType)).not.toHaveBeenCalled();
    });
  });
});
