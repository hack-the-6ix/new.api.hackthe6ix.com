import { describe, it, expect, vi, type Mock } from "vitest";
import app from "@/server";
import { db } from "@/db";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { ApiError } from "@/lib/errors";
import { isAdmin } from "@/lib/auth";

// mock dependencies
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  formResponse: {
    seasonCode: "seasonCode",
    formId: "formId",
    userId: "userId",
    responseJson: "responseJson",
    isSubmitted: "isSubmitted",
    updatedAt: "updatedAt",
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
  isAdmin: vi.fn(),
}));

describe("Form Responses Routes", () => {
  describe("GET /seasons/:seasonCode/responses", () => {
    it("should return form responses for a season", async () => {
      // setup
      const mockResponses = [
        {
          formResponseId: "response-1",
          formId: "form-1",
          userId: "user-1",
          seasonCode: "S26",
          responseJson: { answer1: "test" },
          isSubmitted: true,
          updatedAt: new Date().toISOString(),
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(mockResponses),
        })),
      }));
      (db.select as Mock) = selectMock;

      // exercise
      const res = await app.request("/api/seasons/S26/responses", {
        method: "GET",
      });

      // verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponses);
    });

    it("should filter by formId query parameter", async () => {
      // setup
      const mockResponses = [
        {
          formResponseId: "response-1",
          formId: "form-1",
          userId: "user-1",
          seasonCode: "S26",
          responseJson: { answer1: "test" },
          isSubmitted: true,
          updatedAt: new Date().toISOString(),
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(mockResponses),
        })),
      }));
      (db.select as Mock) = selectMock;

      // exercise
      const res = await app.request(
        "/api/seasons/S26/responses?formId=01936d3f-1234-7890-abcd-123456789abc",
        {
          method: "GET",
        },
      );

      // verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponses);
    });

    it("should return 500 on database error", async () => {
      // setup
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        })),
      }));
      (db.select as Mock) = selectMock;
      (handleDbError as Mock).mockReturnValue(
        new ApiError(500, {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        }),
      );

      // exercise
      const res = await app.request("/api/seasons/S26/responses", {
        method: "GET",
      });

      // verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("errors");
      expect(Array.isArray(data.errors)).toBe(true);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses", () => {
    it("should create/update form response successfully", async () => {
      // setup
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      (db.insert as Mock) = insertMock;

      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      // verify
      expect(res.status).toBe(201);
    });

    it("should return 500 on database error", async () => {
      // setup
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi
            .fn()
            .mockRejectedValue(new Error("Database error")),
        })),
      }));
      (db.insert as Mock) = insertMock;
      (handleDbError as Mock).mockReturnValue(
        new ApiError(500, {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        }),
      );

      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      // verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("errors");
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it("should return 400 for invalid UUID in path", async () => {
      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/invalid-uuid/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      // verify
      expect(res.status).toBe(400);
    });

    // test is not really meaningful since zod validation automatically checks types
    // only included for completeness
    it("should return 400 for missing required fields", async () => {
      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionToken: "user-session-token",
            // missing responseJson and isSubmitted
          }),
        },
      );

      // verify
      expect(res.status).toBe(400);
    });
  });

  describe("GET /seasons/:seasonCode/forms/:formId/responses/random", () => {
    it("should return a random form response", async () => {
      // setup
      const mockResponse = {
        formResponseId: "response-1",
        formId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user-1",
        seasonCode: "S26",
        responseJson: { answer1: "test" },
        isSubmitted: true,
        updatedAt: new Date().toISOString(),
      };

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([mockResponse]),
            })),
          })),
        })),
      }));
      (db.select as Mock) = selectMock;

      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponse);
    });

    it("should return 409 when no form responses found", async () => {
      // setup
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      }));
      (db.select as Mock) = selectMock;

      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toHaveProperty("success", false);
      expect(data.errors[0]).toHaveProperty("code", "FORM_RESPONSES_NOT_FOUND");
    });

    it("should return 500 on database error", async () => {
      // setup
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockRejectedValue(new Error("Database error")),
            })),
          })),
        })),
      }));
      (db.select as Mock) = selectMock;
      (handleDbError as Mock).mockReturnValue(
        new ApiError(500, {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        }),
      );

      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("errors");
      expect(Array.isArray(data.errors)).toBe(true);
    });

    it("should return 400 for invalid UUID in path", async () => {
      // exercise
      const res = await app.request(
        "/api/seasons/S26/forms/invalid-uuid/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid season code", async () => {
      // exercise
      const res = await app.request(
        "/api/seasons/INVALID/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(res.status).toBe(400);
    });

    it("should use RANDOM ordering for randomness", async () => {
      // setup
      const mockResponse = {
        formResponseId: "response-1",
        formId: "01936d3f-1234-7890-abcd-123456789abc",
        userId: "user-1",
        seasonCode: "S26",
        responseJson: { answer1: "test" },
        isSubmitted: true,
        updatedAt: new Date().toISOString(),
      };

      const limitMock = vi.fn().mockResolvedValue([mockResponse]);
      const orderByMock = vi.fn(() => ({ limit: limitMock }));
      const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectMock = vi.fn(() => ({ from: fromMock }));
      (db.select as Mock) = selectMock;

      // exercise
      await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "POST",
        },
      );

      // verify
      expect(orderByMock).toHaveBeenCalled();
      expect(limitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses with targetUserId", () => {
    it("should allow admin to upsert for another user when targetUserId is provided", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "admin-user" }]), // admin found
        })),
      }));
      (db.insert as Mock) = insertMock;
      (db.select as Mock) = selectMock;
      vi.mocked(isAdmin).mockResolvedValue(true);

      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
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

    it("should allow admin to upsert for themselves when targetUserId is not provided", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "admin-user" }]), // admin found
        })),
      }));
      (db.insert as Mock) = insertMock;
      (db.select as Mock) = selectMock;
      vi.mocked(isAdmin).mockResolvedValue(true);

      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "admin-user",
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(201);
    });

    it("should ignore targetUserId for non-admin users and use their own userId", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]), // not admin
        })),
      }));
      (db.insert as Mock) = insertMock;
      (db.select as Mock) = selectMock;
      vi.mocked(isAdmin).mockResolvedValue(false);

      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "regular-user",
            targetUserId: "01937000-0000-7000-8000-000000000001", // should be ignored
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(201);
      // Verify the insert was called with regular-user, not targetUserId
      const valuesMock = insertMock.mock.results[0].value;
      expect(valuesMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "regular-user",
        }),
      );
    });

    it("should allow non-admin users to upsert their own responses", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]), // not admin
        })),
      }));
      (db.insert as Mock) = insertMock;
      (db.select as Mock) = selectMock;
      vi.mocked(isAdmin).mockResolvedValue(false);

      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "regular-user",
            responseJson: { answer1: "test" },
            isSubmitted: true,
          }),
        },
      );

      expect(res.status).toBe(201);
    });

    it("should return 500 on database error during upsert", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi
            .fn()
            .mockRejectedValue(new Error("Database error")),
        })),
      }));
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      }));
      (db.insert as Mock) = insertMock;
      (db.select as Mock) = selectMock;
      (handleDbError as Mock).mockReturnValue(
        new ApiError(500, {
          code: "DATABASE_ERROR",
          message: "A database error occurred",
        }),
      );

      const res = await app.request(
        "/api/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: "user",
            targetUserId: "00000000-0000-0000-0000-000000000000",
            responseJson: { answer1: "test" },
            isSubmitted: true,
          }),
        },
      );

      expect(res.status).toBe(500);
    });
  });
});
