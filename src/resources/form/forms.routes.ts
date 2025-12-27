import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
} from "@/resources/form/forms.service";
import { isAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";

// Existing schemas (keep yours)
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

const updateFormBodySchema = z.object({
  sessionToken: z.string(),
  openTime: z.string().datetime().optional().nullable(),
  closeTime: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  // If provided: replace questions. If omitted: leave unchanged.
  questions: z.array(questionSchema).optional(),
});

const formSchema = z.object({
  formId: z.string().uuid(),
  seasonCode: z.string().length(3),
  openTime: z.string().datetime().nullable(),
  closeTime: z.string().datetime().nullable(),
  tags: z.array(z.string()),
});

const formsRoute = new Hono();

// --- existing CREATE (keep your code) ---
formsRoute.post(
  "/seasons/:seasonCode/forms",
  describeRoute({
    summary: "Create Form (Admin Only)",
    tags: ["Forms"],
    responses: {
      201: {
        description: "Created",
        content: { "application/json": { schema: resolver(formSchema) } },
      },
      ...genericErrorResponse(400),
      ...genericErrorResponse(401),
      ...genericErrorResponse(403),
      ...genericErrorResponse(500),
    },
  }),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  validator("json", createFormBodySchema),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const admin = await isAdmin(body.sessionToken);
    if (!admin) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "Admin access required",
        suggestion: "Ensure you have admin privileges",
      });
    }

    const created = await createForm({
      seasonCode: params.seasonCode,
      openTime: body.openTime ? new Date(body.openTime) : null,
      closeTime: body.closeTime ? new Date(body.closeTime) : null,
      tags: body.tags,
      questions: body.questions,
    });

    return c.json(
      {
        formId: created.formId,
        seasonCode: created.seasonCode,
        openTime: created.openTime?.toISOString() ?? null,
        closeTime: created.closeTime?.toISOString() ?? null,
        tags: created.tags,
      },
      201,
    );
  },
);

// --- CLONE ---
formsRoute.post(
  "/seasons/:seasonCode/forms/:formId/clone",
  describeRoute({
    summary: "Clone Form (Admin Only)",
    tags: ["Forms"],
    responses: {
      201: {
        description: "Cloned",
        content: { "application/json": { schema: resolver(formSchema) } },
      },
      ...genericErrorResponse(400),
      ...genericErrorResponse(401),
      ...genericErrorResponse(403),
      ...genericErrorResponse(404),
      ...genericErrorResponse(500),
    },
  }),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.string().uuid() }),
  ),
  validator("json", z.object({ sessionToken: z.string() })),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const admin = await isAdmin(body.sessionToken);
    if (!admin) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "Admin access required",
        suggestion: "Ensure you have admin privileges",
      });
    }

    const cloned = await cloneForm(params.seasonCode, params.formId);

    return c.json(
      {
        formId: cloned.formId,
        seasonCode: cloned.seasonCode,
        openTime: cloned.openTime?.toISOString() ?? null,
        closeTime: cloned.closeTime?.toISOString() ?? null,
        tags: cloned.tags,
      },
      201,
    );
  },
);

// --- UPDATE ---
formsRoute.post(
  "/seasons/:seasonCode/forms/:formId",
  describeRoute({
    summary: "Update Form (Admin Only)",
    tags: ["Forms"],
    responses: {
      200: {
        description: "Updated",
        content: { "application/json": { schema: resolver(formSchema) } },
      },
      ...genericErrorResponse(400),
      ...genericErrorResponse(401),
      ...genericErrorResponse(403),
      ...genericErrorResponse(404),
      ...genericErrorResponse(500),
    },
  }),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.string().uuid() }),
  ),
  validator("json", updateFormBodySchema),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const admin = await isAdmin(body.sessionToken);
    if (!admin) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "Admin access required",
        suggestion: "Ensure you have admin privileges",
      });
    }

    const updated = await updateForm({
      seasonCode: params.seasonCode,
      formId: params.formId,
      openTime: body.openTime ? new Date(body.openTime) : null,
      closeTime: body.closeTime ? new Date(body.closeTime) : null,
      tags: body.tags,
      questions: body.questions,
    });

    return c.json(
      {
        formId: updated.formId,
        seasonCode: updated.seasonCode,
        openTime: updated.openTime?.toISOString() ?? null,
        closeTime: updated.closeTime?.toISOString() ?? null,
        tags: updated.tags,
      },
      200,
    );
  },
);

// --- DELETE ---
formsRoute.delete(
  "/seasons/:seasonCode/forms/:formId",
  describeRoute({
    summary: "Delete Form (Admin Only)",
    tags: ["Forms"],
    responses: {
      204: { description: "Deleted" },
      ...genericErrorResponse(400),
      ...genericErrorResponse(401),
      ...genericErrorResponse(403),
      ...genericErrorResponse(404),
      ...genericErrorResponse(409),
      ...genericErrorResponse(500),
    },
  }),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.string().uuid() }),
  ),
  validator("json", z.object({ sessionToken: z.string() })),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const admin = await isAdmin(body.sessionToken);
    if (!admin) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "Admin access required",
        suggestion: "Ensure you have admin privileges",
      });
    }

    await deleteForm(params.seasonCode, params.formId);
    return c.body(null, 204);
  },
);

export default formsRoute;
