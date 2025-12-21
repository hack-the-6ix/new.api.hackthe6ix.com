import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { createForm } from "@/resources/form/forms.service";
import { isAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";

const questionSchema = z.object({
  formQuestionId: z.string().max(80),
  questionType: z.string(),
  tags: z.array(z.string()).optional().default([]),
});

const createFormBodySchema = z.object({
  sessionToken: z.string(),
  openTime: z.string().datetime().optional().nullable(),
  closeTime: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  questions: z.array(questionSchema).optional().default([]),
});

const formSchema = z.object({
  formId: z.string().uuid(),
  seasonCode: z.string().length(3),
  openTime: z.string().datetime().nullable(),
  closeTime: z.string().datetime().nullable(),
  tags: z.array(z.string()),
});

const createFormResponse = {
  summary: "Create Form (Admin Only)",
  description: "Create a new form for a season with optional questions",
  tags: ["Forms"],
  responses: {
    201: {
      description: "Form created successfully",
      content: {
        "application/json": { schema: resolver(formSchema) },
      },
    },
    ...genericErrorResponse(400),
    ...genericErrorResponse(401),
    ...genericErrorResponse(403),
    ...genericErrorResponse(500),
  },
};

const formsRoute = new Hono();

formsRoute.post(
  "/seasons/:seasonCode/forms",
  describeRoute(createFormResponse),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  validator("json", createFormBodySchema),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    // Verify admin access
    const userIdFromRequest = body.sessionToken; // TODO: extract from sessionToken in actual implementation
    const admin = await isAdmin(userIdFromRequest);
    if (!admin) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "Admin access required",
        suggestion: "Ensure you have admin privileges",
      });
    }

    const form = await createForm({
      seasonCode: params.seasonCode,
      openTime: body.openTime ? new Date(body.openTime) : null,
      closeTime: body.closeTime ? new Date(body.closeTime) : null,
      tags: body.tags,
      questions: body.questions,
    });

    return c.json(
      {
        formId: form.formId,
        seasonCode: form.seasonCode,
        openTime: form.openTime?.toISOString() ?? null,
        closeTime: form.closeTime?.toISOString() ?? null,
        tags: form.tags,
      },
      201,
    );
  },
);

export default formsRoute;
