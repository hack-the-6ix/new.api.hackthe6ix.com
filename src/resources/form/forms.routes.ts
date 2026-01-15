import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  createForm,
  updateForm,
  deleteForm,
  cloneForm,
  getForms,
} from "@/resources/form/forms.service";
import { genericErrorResponse } from "@/config/openapi";
import { requireRoles, UserType } from "@/lib/auth";
import { formResponseSchema } from "@/resources/form/responses/responses.routes";

const questionSchema = z.object({
  formQuestionId: z.string().max(80),
  questionType: z.string(),
  tags: z.array(z.string()).optional().default([]),
});

const createFormBodySchema = z.object({
  openTime: z.iso.datetime().optional().nullable(),
  closeTime: z.iso.datetime().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  questions: z.array(questionSchema).optional().default([]),
});

const updateFormBodySchema = z.object({
  openTime: z.iso.datetime().optional().nullable(),
  closeTime: z.iso.datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  questions: z.array(questionSchema).optional(),
});

const formSchema = z.object({
  formId: z.guid(),
  seasonCode: z.string().length(3),
  openTime: z.iso.datetime().nullable(),
  closeTime: z.iso.datetime().nullable(),
  tags: z.array(z.string()),
});

const formAndResponseSchema = formSchema.extend({
  responses: z.array(formResponseSchema),
});

const formsRoute = new Hono();

// --- GET ALL FORMS ---
const getAllFormsDescription = {
  summary: "Get all Forms",
  description: "Get all forms within a season (Admin Only",
  tags: ["Form Responses"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(z.array(formSchema)) },
      },
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(401),
  },
};

formsRoute.get(
  "/seasons/:seasonCode/forms",
  describeRoute(getAllFormsDescription),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  requireRoles(UserType.Admin),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;

    const responses = await getForms(seasonCode);
    return c.json(responses);
  },
);

// --- GET FORM ---
const getFormsDescription = {
  summary: "Get specific Forms",
  description: "Get a forms based on the given form id",
  tags: ["Form Responses"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: resolver(formAndResponseSchema),
        },
      },
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(401),
  },
};

formsRoute.get(
  "/seasons/:seasonCode/forms/:formId",
  describeRoute(getFormsDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.guid() }),
  ),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const formId = c.req.valid("param").formId;

    const responses = await getForms(seasonCode, formId);
    return c.json(responses);
  },
);

// --- CREATE ---
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
  requireRoles(UserType.Admin),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

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
  requireRoles(UserType.Admin),
  async (c) => {
    const params = c.req.valid("param");

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
  requireRoles(UserType.Admin),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

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
  requireRoles(UserType.Admin),
  async (c) => {
    const params = c.req.valid("param");

    await deleteForm(params.seasonCode, params.formId);
    return c.body(null, 204);
  },
);

export default formsRoute;
