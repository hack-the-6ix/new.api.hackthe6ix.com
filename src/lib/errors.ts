import { z } from "zod";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

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
  errors: z.array(errorDetailSchema),
  timestamp: z.iso.time(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export class ApiError extends HTTPException {
  public errors: ErrorDetail[];
  public timestamp: string;

  constructor(
    statusCode: ContentfulStatusCode,
    errors: ErrorDetail | ErrorDetail[],
  ) {
    const errorArray: ErrorDetail[] = Array.isArray(errors) ? errors : [errors]; //enforce is array

    // doesn't matter which message we pass to super, as toJSON() will be used for response body anyways
    super(statusCode, { message: errorArray[0]?.message });
    this.errors = errorArray;
    this.timestamp = new Date().toUTCString();
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      errors: this.errors,
      timestamp: this.timestamp,
    };
  }
}

export const handleError = (error: unknown, c: Context) => {
  if (error instanceof ApiError) {
    return c.json(error.toJSON(), error.status);
  } else {
    console.error("Unhandled error:", error);
    return c.json(
      {
        success: false,
        errors: [
          {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred.",
            detail: String(error),
            suggestion: "Please try again later.",
          },
        ],
      },
      500,
    );
  }
};
