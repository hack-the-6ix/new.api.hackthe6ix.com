import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  getFormResponses,
  validateFormResponseJson,
  upsertFormResponse,
  getRandomFormResponse,
} from "./responses.service";
import { isUserType } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";
import { requireRoles, UserType } from "@/lib/auth";

const formResponsesRoute = new Hono();

const formResponseSchema = z.object({
  formResponseId: z.guid(),
  formId: z.guid(),
  userId: z.guid(),
  seasonCode: z.string().length(3),
  responseJson: z.json(),
  isSubmitted: z.boolean(),
  updatedAt: z.iso.datetime(),
});

const getFormResponsesDescription = {
  summary: "Get Form Responses",
  description:
    "Get all form responses for a certain form (Admin only), or get a user's own responses (All users)",
  tags: ["Form Responses"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(z.array(formResponseSchema)) },
      },
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(401),
  },
};

formResponsesRoute.get(
  "/seasons/:seasonCode/responses",
  describeRoute(getFormResponsesDescription),
  validator(
    "query",
    z.object({
      formId: z.guid().optional(),
      userId: z.guid().optional(),
    }),
  ),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  requireRoles(UserType.User),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const query = c.req.valid("query");

    // TODO: need to implement check for proper auth/permissions here
    // i.e. only admins can get all responses of a form, users can only get their own
    // alt: use middleware to enforce auth/permissions before reaching this point

    const responses = await getFormResponses(
      seasonCode,
      query.formId,
      query.userId,
    );
    return c.json(responses);
  },
);

const getRandomFormResponseDescription = {
  summary: "Get Random Form Response (Admin)",
  description: "Get a random form response for a season (Admin only)",
  tags: ["Form Responses"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(formResponseSchema) },
      },
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(409),
  },
};

formResponsesRoute.post(
  "/seasons/:seasonCode/forms/:formId/responses/random",
  describeRoute(getRandomFormResponseDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.guid() }),
  ),
  requireRoles(UserType.Admin),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const formId = c.req.valid("param").formId;

    const response = await getRandomFormResponse(formId, seasonCode);
    if (!response) {
      throw new ApiError(409, {
        code: "FORM_RESPONSES_NOT_FOUND",
        message: "No form responses found",
        suggestion:
          "Ensure form exists with at least one response submitted to this form",
      });
    }
    return c.json(response);
  },
);

const upsertFormResponseDescription = {
  summary: "Upsert Form Response",
  description: "Upsert a new form response for a certain form (All users)",
  tags: ["Form Responses"],
  responses: {
    201: {
      description: "Successful response",
      // no response body (just a status code should suffice)
    },
    ...genericErrorResponse(500),
  },
};

// upsert form response
formResponsesRoute.post(
  "/seasons/:seasonCode/forms/:formId/responses",
  describeRoute(upsertFormResponseDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.guid() }),
  ),
  validator(
    "json",
    z.object({
      sessionToken: z.string(),
      targetUserId: z.guid().optional(),
      responseJson: z.json(),
      isSubmitted: z.boolean(),
    }),
  ),
  requireRoles(UserType.User),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const userIdFromRequest = body.sessionToken; // TODO: would instead be extracted from sessionToken in actual implementation (or have middleware do it)

    // if targetUserId is supplied and request is made by admin, allow upsert for specified userId, else use userId from sessionToken
    const userId =
      body.targetUserId && (await isUserType(c, UserType.Admin))
        ? body.targetUserId
        : userIdFromRequest;

    validateFormResponseJson(params.formId, body);

    await upsertFormResponse(
      params.seasonCode,
      userId,
      params.formId,
      body.responseJson,
      body.isSubmitted,
    );
    return c.json({}, 201);
  },
);

export default formResponsesRoute;
