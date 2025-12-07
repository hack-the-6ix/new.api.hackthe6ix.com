import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getFormResponses,
  upsertFormResponse,
  getRandomFormResponse,
} from "./responses.service";
import { db } from "@/db";
import { formResponse } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";

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
      const apiError = new Error("DB_CONNECTION_ERROR");
      whereMock.mockRejectedValue(dbError);
      (handleDbError as Mock).mockReturnValue(apiError);

      await expect(getFormResponses("S26")).rejects.toThrow(
        "DB_CONNECTION_ERROR",
      );
      expect(handleDbError).toHaveBeenCalledWith(dbError);
    });
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
      const apiError = new Error("DB_CONSTRAINT_ERROR");
      onConflictDoUpdateMock.mockRejectedValue(dbError);
      (handleDbError as Mock).mockReturnValue(apiError);

      // verify
      await expect(
        upsertFormResponse("S26", "user-1", "form-1", {}, false),
      ).rejects.toThrow("DB_CONSTRAINT_ERROR");
      expect(handleDbError).toHaveBeenCalledWith(dbError);
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
      const apiError = new Error("DB_QUERY_ERROR");
      limitMock.mockRejectedValue(dbError);
      (handleDbError as Mock).mockReturnValue(apiError);

      // verify
      await expect(getRandomFormResponse("form-1", "S26")).rejects.toThrow(
        "DB_QUERY_ERROR",
      );
      expect(handleDbError).toHaveBeenCalledWith(dbError);
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
});
