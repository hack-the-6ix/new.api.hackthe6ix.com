import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getAllFormResponses,
  validateFormResponseJson,
  updateFormResponse,
} from "./responses.service";
import formResponsesRoute from "./responses.routes";
import { db } from "@/db";
import { formResponse } from "@/db/schema";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";

// Mock dependencies
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
      // Setup
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

      // Exercise
      const result = await getAllFormResponses("S26");

      // Verify
      expect(result).toEqual(mockResponses);
      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(formResponse);
    });

    it("should filter by formId when provided", async () => {
      // Setup
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

      const result = await getAllFormResponses("S26", "form-1");

      expect(result).toEqual(mockResponses);
      expect(whereMock).toHaveBeenCalled();
    });

    it("should filter by userId when provided", async () => {
      // Setup
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

      // Exercise
      const result = await getAllFormResponses("S26", undefined, "user-1");

      // Verify
      expect(result).toEqual(mockResponses);
      expect(whereMock).toHaveBeenCalled();
    });

    it("should throw wrapped db error on failure", async () => {
      // Setup
      const dbError = new Error("Database connection failed");
      whereMock.mockRejectedValue(dbError);
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "DB_CONNECTION_ERROR",
      });

      await expect(getAllFormResponses("S26")).rejects.toThrow(
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
      // Setup
      const seasonCode = "S26";
      const userId = "user-1";
      const formId = "form-1";
      const responseJson = { answer1: "test" };
      const isSubmitted = false;

      // Exercise
      await updateFormResponse(
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      );

      // Verify
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
      // Setup
      const seasonCode = "S26";
      const userId = "user-1";
      const formId = "form-1";
      const responseJson = { answer1: "updated" };
      const isSubmitted = true;

      // Exercise
      await updateFormResponse(
        seasonCode,
        userId,
        formId,
        responseJson,
        isSubmitted,
      );

      // Verify
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
      // Setup
      const dbError = new Error("Unique constraint violation");
      onConflictDoUpdateMock.mockRejectedValue(dbError);
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "DB_CONSTRAINT_ERROR",
      });

      // Verify
      await expect(
        updateFormResponse("S26", "user-1", "form-1", {}, false),
      ).rejects.toThrow("DB_CONSTRAINT_ERROR");
      expect(getDbErrorMessage).toHaveBeenCalledWith(dbError);
    });
  });
});

describe("Form Responses Routes", () => {
  describe("GET /seasons/:seasonCode/responses", () => {
    it("should return form responses for a season", async () => {
      // Setup
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

      // Exercise
      const res = await formResponsesRoute.request("/seasons/S26/responses", {
        method: "GET",
      });

      // Verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponses);
    });

    it("should filter by formId query parameter", async () => {
      // Setup
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

      // Exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/responses?formId=550e8400-e29b-41d4-a716-446655440000",
        {
          method: "GET",
        },
      );

      // Verify
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockResponses);
    });

    it("should return 500 on database error", async () => {
      // Setup
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        })),
      }));
      (db.select as Mock) = selectMock;
      (getDbErrorMessage as Mock).mockReturnValue({
        message: "Database error",
      });

      // Exercise
      const res = await formResponsesRoute.request("/seasons/S26/responses", {
        method: "GET",
      });

      // Verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("message");
    });
  });

  describe("POST /seasons/:seasonCode/forms/:formId/responses", () => {
    it("should create/update form response successfully", async () => {
      // Setup
      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      (db.insert as Mock) = insertMock;

      // Exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/550e8400-e29b-41d4-a716-446655440000/responses",
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

      // Verify
      expect(res.status).toBe(200);
    });

    it("should return 500 on database error", async () => {
      // Setup
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

      // Exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/550e8400-e29b-41d4-a716-446655440000/responses",
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

      // Verify
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty("message");
    });

    it("should return 400 for invalid UUID in path", async () => {
      // Exercise
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

      // Verify
      expect(res.status).toBe(400);
    });

    it("should return 400 for missing required fields", async () => {
      // Exercise
      const res = await formResponsesRoute.request(
        "/seasons/S26/forms/550e8400-e29b-41d4-a716-446655440000/responses",
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

      // Verify
      expect(res.status).toBe(400);
    });
  });
});
