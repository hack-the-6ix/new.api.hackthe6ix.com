import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getFormResponses,
  validateFormResponseJson,
  upsertFormResponse,
  getRandomFormResponse,
} from "./responses.service";
import formResponsesRoute from "./responses.routes";
import { db } from "@/db";
import { formResponse } from "@/db/schema";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";

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
  getDbErrorMessage: vi.fn(),
}));

describe("Form Responses Service", () => {
  describe("getAllFormResponses", () => {
    let selectMock: Mock;
    let fromMock: Mock;
    let whereMock: Mock;

    beforeEach(() => {
      whereMock = vi.fn();
      fromMock = vi.fn(() => ({ where: whereMock }));
      selectMock = vi.fn(() => ({ from: fromMock }));
      (db.select as Mock) = selectMock;
      vi.clearAllMocks();
    });

    it("should return all form responses for a season", async () => {
      // setup
      const mockResponses = [
        {
          formResponseId: "response-1",
          formId: "form-1",
          userId: "user-1",
          seasonCode: "S26",
          responseJson: { answer1: "test" },
          isSubmitted: true,
          updatedAt: new Date(),
        },
      ];
      whereMock.mockResolvedValue(mockResponses);

      // exercise
      const result = await getFormResponses("S26");

      // verify
      expect(result).toEqual(mockResponses);
      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(formResponse);
    });

    it("should filter by formId when provided", async () => {
      // setup
      const mockResponses = [
        {
          formResponseId: "response-1",
          formId: "form-1",
          userId: "user-1",
          seasonCode: "S26",
          responseJson: { answer1: "test" },
          isSubmitted: true,
          updatedAt: new Date(),
        },
      ];
      whereMock.mockResolvedValue(mockResponses);

      const result = await getFormResponses("S26", "form-1");

      expect(result).toEqual(mockResponses);
      expect(whereMock).toHaveBeenCalled();
    });

    it("should filter by userId when provided", async () => {
      // setup
      const mockResponses = [
        {
          formResponseId: "response-1",
          formId: "form-1",
          userId: "user-1",
          seasonCode: "S26",
          responseJson: { answer1: "test" },
          isSubmitted: true,
          updatedAt: new Date(),
        },
      ];
      whereMock.mockResolvedValue(mockResponses);

      // exercise
      const result = await getFormResponses("S26", undefined, "user-1");

      // verify
      expect(result).toEqual(mockResponses);
      expect(whereMock).toHaveBeenCalled();
    });

    it("should throw wrapped db error on failure", async () => {
      // setup
      const dbError = new Error("Database connection failed");
      whereMock.mockRejectedValue(dbError);
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "DB_CONNECTION_ERROR",
      });

      await expect(getFormResponses("S26")).rejects.toThrow(
        "DB_CONNECTION_ERROR",
      );
      expect(getDbErrorMessage).toHaveBeenCalledWith(dbError);
    });
  });

  describe("validateFormResponseJson", () => {
    it("should return empty array for valid response (placeholder implementation)", () => {
      const formId = "form-1";
      const responseJson = { answer1: "test", answer2: 42 };
      const result = validateFormResponseJson(formId, responseJson);
      expect(result).toEqual([]);
    });

    // when actual validation logic is implemented, add tests here
  });

  describe("updateFormResponse", () => {
    let insertMock: Mock;
    let valuesMock: Mock;
    let onConflictDoUpdateMock: Mock;

    beforeEach(() => {
      onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
      valuesMock = vi.fn(() => ({
        onConflictDoUpdate: onConflictDoUpdateMock,
      }));
      insertMock = vi.fn(() => ({ values: valuesMock }));
      (db.insert as Mock) = insertMock;
      vi.clearAllMocks();
    });

    it("should insert a new form response", async () => {
      // setup
      const seasonCode = "S26";
      const userId = "user-1";
      const formId = "form-1";
      const responseJson = { answer1: "test" };
      const isSubmitted = false;

      // exercise
      await upsertFormResponse(
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      );

      // verify
      expect(insertMock).toHaveBeenCalledWith(formResponse);
      expect(valuesMock).toHaveBeenCalledWith({
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      });
      expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
        target: [
          formResponse.seasonCode,
          formResponse.userId,
          formResponse.formId,
        ],
        set: expect.objectContaining({
          responseJson,
          isSubmitted,
          updatedAt: expect.any(Date),
        }),
      });
    });

    it("should update existing form response on conflict", async () => {
      // setup
      const seasonCode = "S26";
      const userId = "user-1";
      const formId = "form-1";
      const responseJson = { answer1: "updated" };
      const isSubmitted = true;

      // exercise
      await upsertFormResponse(
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      );

      // verify
      expect(onConflictDoUpdateMock).toHaveBeenCalledWith({
        target: [
          formResponse.seasonCode,
          formResponse.userId,
          formResponse.formId,
        ],
        set: expect.objectContaining({
          responseJson,
          isSubmitted,
        }),
      });
    });

    it("should throw wrapped db error on failure", async () => {
      // setup
      const dbError = new Error("Unique constraint violation");
      onConflictDoUpdateMock.mockRejectedValue(dbError);
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "DB_CONSTRAINT_ERROR",
      });

      // verify
      await expect(
        upsertFormResponse("S26", "user-1", "form-1", {}, false),
      ).rejects.toThrow("DB_CONSTRAINT_ERROR");
      expect(getDbErrorMessage).toHaveBeenCalledWith(dbError);
    });
  });

  describe("getRandomFormResponse", () => {
    let selectMock: Mock;
    let fromMock: Mock;
    let whereMock: Mock;
    let orderByMock: Mock;
    let limitMock: Mock;

    beforeEach(() => {
      limitMock = vi.fn();
      orderByMock = vi.fn(() => ({ limit: limitMock }));
      whereMock = vi.fn(() => ({ orderBy: orderByMock }));
      fromMock = vi.fn(() => ({ where: whereMock }));
      selectMock = vi.fn(() => ({ from: fromMock }));
      (db.select as Mock) = selectMock;
      vi.clearAllMocks();
    });

    it("should return a random form response", async () => {
      // setup
      const mockResponse = {
        formResponseId: "response-1",
        formId: "form-1",
        userId: "user-1",
        seasonCode: "S26",
        responseJson: { answer1: "test" },
        isSubmitted: true,
        updatedAt: new Date(),
      };
      limitMock.mockResolvedValue([mockResponse]);

      // exercise
      const result = await getRandomFormResponse("form-1", "S26");

      // verify
      expect(result).toEqual(mockResponse);
      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(formResponse);
      expect(whereMock).toHaveBeenCalled();
      expect(orderByMock).toHaveBeenCalled();
      expect(limitMock).toHaveBeenCalledWith(1);
    });

    it("should return null when no responses found", async () => {
      // setup
      limitMock.mockResolvedValue([]);

      // exercise
      const result = await getRandomFormResponse("form-1", "S26");

      // verify
      expect(result).toBeNull();
    });

    it("should throw wrapped db error on failure", async () => {
      // setup
      const dbError = new Error("Database query failed");
      limitMock.mockRejectedValue(dbError);
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "DB_QUERY_ERROR",
      });

      // verify
      await expect(getRandomFormResponse("form-1", "S26")).rejects.toThrow(
        "DB_QUERY_ERROR",
      );
      expect(getDbErrorMessage).toHaveBeenCalledWith(dbError);
    });

    it("should filter by both formId and seasonCode", async () => {
      // setup
      const mockResponse = {
        formResponseId: "response-1",
        formId: "form-1",
        userId: "user-1",
        seasonCode: "S26",
        responseJson: { answer1: "test" },
        isSubmitted: true,
        updatedAt: new Date(),
      };
      limitMock.mockResolvedValue([mockResponse]);

      // exercise
      await getRandomFormResponse("form-1", "S26");

      // verify
      expect(whereMock).toHaveBeenCalled();
      // The where clause should include both formId and seasonCode filters
      const whereArg = whereMock.mock.calls[0][0];
      expect(whereArg).toHaveProperty("type", "and");
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses/:userId", () => {
    it("should upsert a user's form response successfully (admin route)", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      (db.insert as Mock) = insertMock;

      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/01937000-0000-7000-8000-000000000001",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responseJson: { answer1: "test" },
            isSubmitted: false,
          }),
        },
      );

      expect(res.status).toBe(200);
    });

    it("should return 500 on database error (admin route)", async () => {
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi
            .fn()
            .mockRejectedValue(new Error("Database error")),
        })),
      }));
      (db.insert as Mock) = insertMock;
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "Database error",
      });

      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/01937000-0000-7000-8000-000000000001",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responseJson: { answer1: "test" },
            isSubmitted: true,
          }),
        },
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("message");
    });
  });
});

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
      const res = await formResponsesRoute.request("/seasons/S26/responses", {
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
      const res = await formResponsesRoute.request(
        "/seasons/S26/responses?formId=01936d3f-1234-7890-abcd-123456789abc",
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
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "Database error",
      });

      // exercise
      const res = await formResponsesRoute.request("/seasons/S26/responses", {
        method: "GET",
      });

      // verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("message");
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
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
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
      expect(res.status).toBe(200);
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
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "Database error",
      });

      // exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
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
      expect(data).toHaveProperty("message");
    });

    it("should return 400 for invalid UUID in path", async () => {
      // exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/invalid-uuid/responses",
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
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses",
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
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "GET",
        },
      );

      // verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponse);
    });

    it("should return 404 when no form responses found", async () => {
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
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "GET",
        },
      );

      // verify
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("message", "No form responses found");
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
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "Database error",
      });

      // exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "GET",
        },
      );

      // verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("message");
    });

    it("should return 400 for invalid UUID in path", async () => {
      // exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/invalid-uuid/responses/random",
        {
          method: "GET",
        },
      );

      // verify
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid season code", async () => {
      // exercise
      const res = await formResponsesRoute.request(
        "/seasons/INVALID/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "GET",
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
      await formResponsesRoute.request(
        "/seasons/S26/forms/01936d3f-1234-7890-abcd-123456789abc/responses/random",
        {
          method: "GET",
        },
      );

      // verify
      expect(orderByMock).toHaveBeenCalled();
      expect(limitMock).toHaveBeenCalledWith(1);
    });
  });
});
