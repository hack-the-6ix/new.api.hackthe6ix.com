import { Context } from "hono";
import { afterAll, beforeAll, describe, expect, it, Mock, vi } from "vitest";
import {
  createSeason,
  getSeasonDetails,
} from "@/resources/seasons/seasons.service";
import app from "@/server";
import { ApiError } from "@/lib/errors";

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

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  seasonResponse: {
    seasonCode: "seasonCode",
    seasonId: "seasonId",
    hackerApplicationFormId: "hackerApplicationFormId",
    rsvpFormId: "rsvpFormId",
  },
}));

vi.mock("@/resources/seasons/seasons.service", () => ({
  createSeason: vi.fn(),
  getSeasonDetails: vi.fn(),
}));


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
  getUserId: vi.fn().mockResolvedValue("user-id"),
  requireRoles: vi.fn(() => {
    return async (c: Context, next: () => Promise<void>) => {
      c.set("user", { role: "Admin" });
      await next();
    };
  }),
  UserType: {
    Admin: "admin",
  },
}));

describe("Seasons Routes", () => {
  describe("POST /api/seasons", () => {
    it("should create a season successfully", async () => {
      (createSeason as Mock).mockResolvedValue(true);

      const res = await app.request("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonCode: "S26" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: "success" });
      expect(createSeason).toHaveBeenCalledWith("S26");
    });

    it("should return 409 on conflicting seasonCode", async () => {
      (createSeason as Mock).mockResolvedValue(null);

      const res = await app.request("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonCode: "S26" }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();

      expect(body.error?.[0]).toMatchObject({
        code: "CONFLICT",
        message: "Conflicting seasonCode",
      });
    });

    it("should return 400 for invalid seasonCode", async () => {
      const res = await app.request("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonCode: "TOO_LONG" }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 500 when service throws", async () => {
      (createSeason as Mock).mockRejectedValue(new Error("DB failed"));

      const res = await app.request("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonCode: "S26" }),
      });

      expect(res.status).toBe(500);
    });
  });

  /* ────────────────────────────────────────────
     GET /api/seasons/:seasonCode
  ──────────────────────────────────────────── */
  describe("GET /api/seasons/:seasonCode", () => {
    it("should return season details", async () => {
      const mockSeason = {
        seasonId: "550e8400-e29b-41d4-a716-446655440000",
        seasonCode: "S26",
        hackerApplicationFormId: "550e8400-e29b-41d4-a716-446655440001",
        rsvpFormId: "550e8400-e29b-41d4-a716-446655440002",
      };

      (getSeasonDetails as Mock).mockResolvedValue(mockSeason);

      const res = await app.request("/api/seasons/S26");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockSeason);
      expect(getSeasonDetails).toHaveBeenCalledWith("S26");
    });

    it("should return 400 for invalid seasonCode param", async () => {
      const res = await app.request("/api/seasons/INVALID");

      expect(res.status).toBe(400);
    });

    it("should return 500 on database error", async () => {
      (getSeasonDetails as Mock).mockRejectedValue(
        new ApiError(500, {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        })
      );

      const res = await app.request("/api/seasons/S26");

      expect(res.status).toBe(500);
      const body = await res.json();

      expect(body.success).toBe(false);
      expect(Array.isArray(body.error)).toBe(true);
    });
  });
});
