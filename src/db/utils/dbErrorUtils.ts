import { DrizzleQueryError, DrizzleError } from "drizzle-orm";
import { SQL } from "bun";
import { ApiError } from "@/lib/errors";

// DrizzleORM returns DrizzleQueryError which wraps the original SQL error from the SQL driver we use
// See this discussion: https://github.com/drizzle-team/drizzle-orm/discussions/916

// Bun's PostgreSQL error codes: https://bun.com/docs/runtime/sql#postgresql-specific-error-codes
// Postgresql error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html

type ErrorHandler = (error: SQL.PostgresError) => ApiError;

const PostgresErrorHandlers: Record<string, ErrorHandler> = {
  // Unique constraint violation (23505)
  "23505": (error: SQL.PostgresError) =>
    new ApiError(409, {
      code: "UNIQUE_VIOLATION",
      message: "A duplicate entry was found for a unique field.",
      detail: `Constraint: ${error.constraint}`,
      suggestion: "Ensure the value is unique or update the existing record.",
    }),
  // Foreign key violation (23503)
  "23503": (error: SQL.PostgresError) =>
    new ApiError(409, {
      code: "FOREIGN_KEY_VIOLATION",
      message:
        "A foreign key violation occurred. The record you are trying to link does not exist.",
      detail: `Constraint: ${error.constraint}`,
      suggestion: "Verify the related record exists before linking.",
    }),
  // Invalid text representation (22P02)
  "22P02": () =>
    new ApiError(400, {
      code: "INVALID_TEXT_REPRESENTATION",
      message:
        "The data provided is in an invalid format (e.g., not a valid UUID).",
      suggestion:
        "Check the data format and ensure it matches the expected type.",
    }),
  // Check constraint violation (23514)
  "23514": (error: SQL.PostgresError) =>
    new ApiError(409, {
      code: "CHECK_VIOLATION",
      message: "A check constraint was violated.",
      detail: `Constraint: ${error.constraint}`,
      suggestion:
        "Review the constraint rules and adjust your data accordingly.",
    }),
  // Not null violation (23502)
  "23502": (error: SQL.PostgresError) =>
    new ApiError(400, {
      code: "NOT_NULL_VIOLATION",
      message: `A required field is missing. The column '${error.column}' cannot be null.`,
      detail: `Column: ${error.column}`,
      suggestion: `Provide a value for the '${error.column}' field.`,
    }),
  // Undefined column (42703)
  "42703": (error: SQL.PostgresError) =>
    new ApiError(500, {
      code: "UNDEFINED_COLUMN",
      message: "An undefined column was referenced in the query.",
      detail: `Column: ${error.column}`,
      suggestion: "This is a server error. Please contact support.",
    }),
  // Syntax error (42601)
  "42601": () =>
    new ApiError(500, {
      code: "SYNTAX_ERROR",
      message: "There's a syntax error in the database query.",
      suggestion: "This is a server error. Please contact support.",
    }),
  // Undefined table (42P01)
  "42P01": () =>
    new ApiError(500, {
      code: "UNDEFINED_TABLE",
      message: "A referenced table does not exist in the database.",
      suggestion: "This is a server error. Please contact support.",
    }),
  default: (error: SQL.PostgresError) =>
    new ApiError(500, {
      code: "DATABASE_ERROR",
      message: `A database error occurred: ${error.message}`,
      detail: error.constraint ? `Constraint: ${error.constraint}` : undefined,
    }),
};

/**
 * Converts a Drizzle ORM error into an ApiError.
 * @param error The error object from Drizzle.
 * @returns An ApiError instance ready to be thrown.
 */
export function handleDbError(error: unknown): ApiError {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof SQL.PostgresError
  ) {
    const originalError = error.cause;

    // Check if it's a Postgres server error (Bun wraps these)
    if (originalError.code.trim() === "ERR_POSTGRES_SERVER_ERROR") {
      const handler = PostgresErrorHandlers[originalError.errno ?? "default"];
      if (handler) {
        return handler(originalError);
      }
    }

    // For other Bun SQL error codes, use the code directly as the error code
    // https://bun.com/docs/runtime/sql#postgresql-specific-error-codes
    // For other Bun SQL error codes, use the code directly as the error code
    // https://bun.com/docs/runtime/sql#postgresql-specific-error-codes
    return new ApiError(500, {
      code: originalError.code,
      message: originalError.message,
      detail: originalError.detail,
      suggestion: originalError.hint,
    });
  }

  // Fallback for generic Drizzle errors or other Error instances
  if (error instanceof DrizzleError || error instanceof Error) {
    return new ApiError(500, {
      code: "DRIZZLE_ERROR",
      message: error.message || "An unexpected database error occurred.",
    });
  }

  // Final fallback for unknown error types
  return new ApiError(500, {
    code: "UNKNOWN_DATABASE_ERROR",
    message: "An unknown error occurred.",
  });
}
