import { DrizzleQueryError, DrizzleError } from "drizzle-orm";
import { SQL } from "bun";

// DrizzleORM returns DrizzleQueryError which wraps the original SQL error from the SQL driver we use
// See this discussion: https://github.com/drizzle-team/drizzle-orm/discussions/916

// Bun has its own error codes that may be helpful (but not as detailed as Postgres error codes)
// Postgresql error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html

type ErrorHandler = (error: SQL.PostgresError) => {
  message: string;
  constraint: string | null;
};

const PostgresErrorHandlers: Record<string, ErrorHandler> = {
  "23505": (error: SQL.PostgresError) => ({
    message: "A duplicate entry was found for a unique field.",
    constraint: error.constraint || null,
  }),
  "23503": (error: SQL.PostgresError) => ({
    message:
      "A foreign key violation occurred. The record you are trying to link does not exist.",
    constraint: error.constraint || null,
  }),
  "22P02": () => ({
    message:
      "The data provided is in an invalid format (e.g., not a valid UUID).",
    constraint: null,
  }),
  "23514": (error: SQL.PostgresError) => ({
    message: "A check constraint was violated.",
    constraint: error.constraint || null,
  }),
  "23502": (error: SQL.PostgresError) => ({
    message: `A required field is missing. The column '${error.column}' cannot be null.`,
    constraint: error.column || null,
  }),
  "42703": (error: SQL.PostgresError) => ({
    message: "An undefined column was referenced in the query.",
    constraint: error.column || null,
  }),
  "42601": () => ({
    message: "There's a syntax error in the database query.",
    constraint: null,
  }),
  "42P01": () => ({
    message: "A referenced table does not exist in the database.",
    constraint: null,
  }),
  default: (error: SQL.PostgresError) => ({
    message: `A database error occurred: ${error.message}`,
    constraint: null,
  }),
};

/**
 * Extracts a user-friendly message and constraint from a Drizzle ORM error.
 * @param error The error object from Drizzle.
 * @returns An object with the main error message and constraint name (if applicable).
 */
export function getDbErrorMessage(error: unknown): {
  message: string;
  constraint: string | null;
} {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof SQL.PostgresError
  ) {
    const originalError = error.cause;

    // Check if it is not bun-specific error code
    if (originalError.code === "ERR_POSTGRES_SERVER_ERROR") {
      const handler = PostgresErrorHandlers[originalError.code ?? "default"];

      if (handler) {
        return handler(originalError);
      }
    }

    // Returns bun's error code message: https://bun.com/docs/runtime/sql#postgresql-specific-error-codes
    return {
      message: `A database error occurred: ${originalError.code}`,
      constraint: originalError.constraint || null,
    };
  }

  // Fallback for generic Drizzle errors or other Error instances
  if (error instanceof DrizzleError || error instanceof Error) {
    return {
      message: error.message || "An unexpected error occurred.",
      constraint: null,
    };
  }

  // Final fallback for unknown error types
  return { message: "An unknown error occurred.", constraint: null };
}
