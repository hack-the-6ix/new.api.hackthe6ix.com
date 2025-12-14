import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("bun", () => ({
  SQL: {},
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn((error) => error),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
}));

import { ApiError, DBError, handleError, type ErrorDetail } from "../errors";
import { Hono } from "hono";
import { isAdmin } from "@/lib/auth";

describe("ApiError", () => {
  describe("constructor", () => {
    it("should create an ApiError with a single error detail", () => {
      const errorDetail: ErrorDetail = {
        code: "NOT_FOUND",
        message: "Resource not found",
      };

      const error = new ApiError(404, errorDetail);

      expect(error.status).toBe(404);
      expect(error.error).toEqual([errorDetail]);
      expect(error.timestamp).toBeDefined();
    });

    it("should create an ApiError with multiple error details", () => {
      const errorDetails: ErrorDetail[] = [
        { code: "INVALID_EMAIL", message: "Email is invalid" },
        { code: "INVALID_PASSWORD", message: "Password is too weak" },
      ];

      const error = new ApiError(400, errorDetails);

      expect(error.status).toBe(400);
      expect(error.error).toEqual(errorDetails);
      expect(error.error).toHaveLength(2);
    });

    it("should set timestamp to current UTC time", () => {
      const error = new ApiError(500, { code: "TEST", message: "Test error" });
      expect(typeof error.timestamp).toBe("string");
      const timestampDate = new Date(error.timestamp);
      expect(timestampDate.toUTCString()).toBe(error.timestamp);
    });
  });

  describe("toJSON", () => {
    it("should return user-friendly error response without detail and suggestion", () => {
      const errorDetail: ErrorDetail = {
        code: "NOT_FOUND",
        message: "Resource not found",
        detail: "Database query returned no results",
        suggestion: "Check if the ID is correct",
      };

      const error = new ApiError(404, errorDetail);
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: [
          {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        ],
        timestamp: error.timestamp,
      });
      expect(json.error[0]).not.toHaveProperty("detail");
      expect(json.error[0]).not.toHaveProperty("suggestion");
    });

    it("should strip detail and suggestion from all errors in array", () => {
      const errorDetails: ErrorDetail[] = [
        {
          code: "INVALID_EMAIL",
          message: "Email is invalid",
          detail: "Email format is incorrect",
          suggestion: "Use format: user@example.com",
        },
        {
          code: "INVALID_PASSWORD",
          message: "Password is too weak",
          detail: "Password must be at least 8 characters",
          suggestion: "Add more characters",
        },
      ];

      const error = new ApiError(400, errorDetails);
      const json = error.toJSON();

      expect(json.error).toHaveLength(2);
      expect(json.error[0]).toEqual({
        code: "INVALID_EMAIL",
        message: "Email is invalid",
      });
      expect(json.error[1]).toEqual({
        code: "INVALID_PASSWORD",
        message: "Password is too weak",
      });
    });

    it("should preserve code and message fields only", () => {
      const error = new ApiError(400, {
        code: "TEST_CODE",
        message: "Test message",
      });
      const json = error.toJSON();

      expect(json.success).toBe(false);
      expect(json.error[0].code).toBe("TEST_CODE");
      expect(json.error[0].message).toBe("Test message");
    });
  });

  describe("toAdminJSON", () => {
    it("should return full error response with detail and suggestion", () => {
      const errorDetail: ErrorDetail = {
        code: "DATABASE_ERROR",
        message: "Query failed",
        detail: "Unique constraint violation on email field",
        suggestion: "Use a different email address",
      };

      const error = new ApiError(500, errorDetail);
      const json = error.toAdminJSON();

      expect(json).toEqual({
        success: false,
        error: [errorDetail],
        timestamp: error.timestamp,
      });
      expect(json.error[0].detail).toBe(
        "Unique constraint violation on email field",
      );
      expect(json.error[0].suggestion).toBe("Use a different email address");
    });

    it("should include all fields for multiple errors", () => {
      const errorDetails: ErrorDetail[] = [
        {
          code: "ERROR_1",
          message: "First error",
          detail: "Detail 1",
          suggestion: "Suggestion 1",
        },
        {
          code: "ERROR_2",
          message: "Second error",
          detail: "Detail 2",
          suggestion: "Suggestion 2",
        },
      ];

      const error = new ApiError(500, errorDetails);
      const json = error.toAdminJSON();

      expect(json.error).toEqual(errorDetails);
      expect(json.error).toHaveLength(2);
    });
  });
});

describe("DBError", () => {
  describe("constructor", () => {
    it("should create a DBError extending ApiError", () => {
      const errorDetail: ErrorDetail = {
        code: "CONSTRAINT_VIOLATION",
        message: "Database constraint violation",
        suggestion: "Check database constraints",
      };

      const error = new DBError(409, errorDetail);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(DBError);
      expect(error.status).toBe(409);
      expect(error.error).toEqual([errorDetail]);
    });
  });

  describe("toJSON", () => {
    it("should hide all database details and return generic error", () => {
      const errorDetail: ErrorDetail = {
        code: "CONSTRAINT_VIOLATION",
        message: "Database constraint violation",
        suggestion: "Check database constraints",
      };

      const error = new DBError(500, errorDetail);
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: [
          {
            code: "DATABASE_ERROR",
            message:
              "A database error occurred. Contact support if the issue persists.",
          },
        ],
        timestamp: error.timestamp,
      });
    });

    it("should hide details even with multiple error objects", () => {
      const errorDetails: ErrorDetail[] = [
        {
          code: "CONSTRAINT_ERROR",
          message: "Constraint violation",
          detail: "Foreign key violation",
          suggestion: "Check relations",
        },
        {
          code: "CONNECTION_ERROR",
          message: "Connection failed",
          detail: "Cannot connect to database",
          suggestion: "Check database is running",
        },
      ];

      const error = new DBError(500, errorDetails);
      const json = error.toJSON();

      expect(json.error).toEqual([
        {
          code: "DATABASE_ERROR",
          message:
            "A database error occurred. Contact support if the issue persists.",
        },
      ]);
      expect(json.error).toHaveLength(1);
    });
  });

  describe("toAdminJSON", () => {
    it("should show full database error details for admins", () => {
      const errorDetail: ErrorDetail = {
        code: "UNIQUE_VIOLATION",
        message: "Duplicate entry",
        detail: "Key (email)=(test@example.com) already exists",
        suggestion: "Use a different email",
      };

      const error = new DBError(409, errorDetail);
      const json = error.toAdminJSON();

      expect(json.error).toEqual([errorDetail]);
      expect(json.error[0].detail).toBe(
        "Key (email)=(test@example.com) already exists",
      );
    });
  });
});

describe("handleError", () => {
  let app: Hono;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = new Hono();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("handling ApiError", () => {
    it("should return admin JSON for ApiError (currently hardcoded as admin)", async () => {
      vi.mocked(isAdmin).mockResolvedValue(true); // Mock admin user

      const errorDetail: ErrorDetail = {
        code: "NOT_FOUND",
        message: "Resource not found",
        detail: "User with ID 123 does not exist",
        suggestion: "Check the user ID",
      };

      app.get("/test", () => {
        throw new ApiError(404, errorDetail);
      });

      app.onError(handleError);

      const res = await app.request("/test");
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error[0].detail).toBeDefined(); // Admin gets details
      expect(data.error[0].suggestion).toBeDefined(); // Admin gets suggestions
    });

    it("should log 500 errors to console", async () => {
      app.get("/test", () => {
        throw new ApiError(500, {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        });
      });

      app.onError(handleError);

      await app.request("/test");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("handling DBError", () => {
    it("should return admin details for DBError (userType hardcoded as admin)", async () => {
      vi.mocked(isAdmin).mockResolvedValue(true); // Mock admin user

      app.get("/test", () => {
        throw new DBError(500, {
          code: "UNIQUE_VIOLATION",
          message: "Duplicate entry",
          detail: "Key (email)=(test@example.com) already exists",
          suggestion: "Use different email",
        });
      });

      app.onError(handleError);

      const res = await app.request("/test");
      const data = await res.json();

      expect(res.status).toBe(500);
      // Since userType is hardcoded as "admin", toAdminJSON is called
      expect(data.error[0].code).toBe("UNIQUE_VIOLATION");
      expect(data.error[0].detail).toBeDefined();
    });

    it("should log DBError to console for 500 status", async () => {
      app.get("/test", () => {
        throw new DBError(500, {
          code: "CONNECTION_ERROR",
          message: "Database connection failed",
        });
      });

      app.onError(handleError);

      await app.request("/test");

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("handling unknown errors", () => {
    it("should handle generic Error objects", async () => {
      app.get("/test", () => {
        throw new Error("Unexpected error");
      });

      app.onError(handleError);

      const res = await app.request("/test");
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error[0].code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("should log unknown errors to console", async () => {
      app.get("/test", () => {
        throw new Error("Unknown error");
      });

      app.onError(handleError);

      await app.request("/test");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unhandled error:",
        expect.any(Error),
      );
    });
  });

  describe("error response format", () => {
    it("should include timestamp in response", async () => {
      app.get("/test", () => {
        throw new ApiError(400, {
          code: "TEST",
          message: "Test error",
        });
      });

      app.onError(handleError);

      const res = await app.request("/test");
      const data = await res.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe("string");
    });

    it("should always set success to false", async () => {
      app.get("/test", () => {
        throw new ApiError(400, {
          code: "TEST",
          message: "Test error",
        });
      });

      app.onError(handleError);

      const res = await app.request("/test");
      const data = await res.json();

      expect(data.success).toBe(false);
    });
  });
});
