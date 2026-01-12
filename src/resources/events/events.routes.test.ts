import { Context } from "hono";
import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as svc from "@/resources/events/events.service";
type CheckInReturn = Awaited<ReturnType<(typeof svc)["checkInUser"]>>;
import app from "@/server";

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

afterEach(() => {
  vi.restoreAllMocks();
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
    eventName: "testEvent",
    startTime: "1:00",
    endTime: "2:00",
  },
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

describe("Events Routes", () => {
  describe("GET /api/seasons/:seasonCode/events", () => {
    it("returns events list", async () => {
      vi.spyOn(svc, "fetchEvents").mockResolvedValue([
        {
          seasonCode: "S26",
          eventId: "e1",
          eventName: "Test Event",
          startTime: null,
          endTime: null,
        },
      ]);

      const res = await app.request("/api/seasons/S26/events");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([
        {
          seasonCode: "S26",
          eventId: "e1",
          eventName: "Test Event",
          startTime: null,
          endTime: null,
        },
      ]);
      expect(svc.fetchEvents).toHaveBeenCalledWith("S26");
    });

    it("returns 500 when service throws", async () => {
      vi.spyOn(svc, "fetchEvents").mockRejectedValue(new Error("boom"));
      const res = await app.request("/api/seasons/S26/events");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/seasons/:seasonCode/events", () => {
    it("creates event successfully", async () => {
      const mockEvent = {
        seasonCode: "S26",
        eventId: "e1",
        eventName: "Hack",
        startTime: null,
        endTime: null,
      };
      vi.spyOn(svc, "createEvent").mockResolvedValue(mockEvent);

      const res = await app.request("/api/seasons/S26/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Hack",
          startTime: "2025-01-01T00:00:00Z",
          endTime: "2025-01-01T01:00:00Z",
        }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockEvent);
      expect(svc.createEvent).toHaveBeenCalled();
    });

    it("returns 409 when event already exists", async () => {
      vi.spyOn(svc, "createEvent").mockResolvedValue(null);
      const res = await app.request("/api/seasons/S26/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Hack",
          startTime: "2025-01-01T00:00:00Z",
          endTime: "2025-01-01T01:00:00Z",
        }),
      });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error?.[0]).toMatchObject({ code: "EVENT_ALREADY_EXISTS" });
    });
  });

  describe("POST /api/seasons/:seasonCode/events/:eventId/check-in", () => {
    it("checks in a user successfully", async () => {
      const mockCheckIn: CheckInReturn = {
        seasonCode: "S26",
        eventId: "e1",
        userId: "u1",
        checkInAuthor: "550e8400-e29b-41d4-a716-446655440000",
        checkInNotes: null,
        createdAt: new Date(),
      };
      vi.spyOn(svc, "checkInUser").mockResolvedValue(mockCheckIn);

      const res = await app.request("/api/seasons/S26/events/e1/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "550e8400-e29b-41d4-a716-446655440000",
          checkInAuthor: "550e8400-e29b-41d4-a716-446655440000",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        ...mockCheckIn,
        createdAt: mockCheckIn.createdAt.toISOString(),
      });
    });

    it("returns 400 for invalid body", async () => {
      const res = await app.request("/api/seasons/S26/events/e1/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "invalid",
          checkInAuthor: "also-invalid",
        }),
      });
      expect(res.status).toBe(400);
    });
  });
});
