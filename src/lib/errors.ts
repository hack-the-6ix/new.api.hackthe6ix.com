import { z } from "zod";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { isUserType, UserType } from "@/lib/auth";
import { dev } from "@/config/env";

/**
 * Generic error detail for individual errors
 */
export const errorDetailSchema = z.object({
  code: z.string(), // e.g., "INVALID_FORMAT", "NOT_FOUND", "DUPLICATE_ENTRY", etc.
  message: z.string(), // Message for frontend display
  detail: z.string().optional(), // More context for debugging
  suggestion: z.string().optional(), // Hints for resolving the error
});

/**
 * Generic API error response schema
 * Consistent error format for all API endpoints
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.array(errorDetailSchema),
  timestamp: z.iso.time(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export class ApiError extends HTTPException {
  public error: ErrorDetail[]; // singular simply because zod validation error response uses 'error' key as well. slightly annoying but oh well
  public timestamp: string;

  constructor(
    statusCode: ContentfulStatusCode,
    error: ErrorDetail | ErrorDetail[],
  ) {
    const errorArray: ErrorDetail[] = [error].flat(); //enforce is array

    // doesn't matter which message we pass to super, as toJSON() will be used for response body anyways
    super(statusCode, { message: errorArray[0]?.message });
    this.error = errorArray;
    this.timestamp = new Date().toUTCString();
  }

  toAdminJSON(): ErrorResponse {
    return {
      success: false,
      error: this.error,
      timestamp: this.timestamp,
    };
  }

  // For default access level, omit 'detail' and 'suggestion' field from errors
  // TODO: specify this in the documentation (low priority)
  toJSON(): ErrorResponse {
    const userErrors = this.error.map(({ code, message }) => ({
      code,
      message,
    }));

    return {
      success: false,
      error: userErrors,
      timestamp: this.timestamp,
    };
  }
}

export class DBError extends ApiError {
  // hide all database details from regular users
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: [
        {
          code: "DATABASE_ERROR",
          message:
            "A database error occurred. Contact support if the issue persists.",
        },
      ],
      timestamp: this.timestamp,
    };
  }
}

export const handleError = async (error: unknown, c: Context) => {
  const admin: boolean = dev || (await isUserType(c, UserType.Admin));

  if (error instanceof ApiError) {
    // only logging internal server errors to avoid cluttering logs, can be adjusted to include more error codes
    if (error.status === 500 || error instanceof DBError) {
      console.error(error);
    }
    if (admin) {
      return c.json(error.toAdminJSON(), error.status);
    }
    return c.json(error.toJSON(), error.status);
  } else {
    console.error("Unhandled error:", error);
    return c.json(
      {
        success: false,
        error: [
          {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred.",
            detail: admin ? String(error) : undefined,
          },
        ],
        timestamp: new Date().toUTCString(),
      },
      500,
    );
  }
};
