import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  getAllFormResponses,
  validateFormResponseJson,
  updateFormResponse,
} from "./responses.service";

const formResponsesRoute = new Hono();

const formResponseSchema = z.object({
  formResponseId: z.uuid(),
  formId: z.uuid(),
  userId: z.uuid(),
  seasonCode: z.string().length(3),
  responseJson: z.json(),
  isSubmitted: z.boolean(),
  updatedAt: z.date(),
});

const getAllResponsesDescription = {
  description: "Get all form responses for a season",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(z.array(formResponseSchema)) },
      },
    },
  },
};

formResponsesRoute.get(
  "/seasons/:seasonCode/responses",
  describeRoute(getAllResponsesDescription),
  validator(
    "query",
    z.object({
      formId: z.uuid().optional(),
      userId: z.uuid().optional(),
    }),
  ),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const query = c.req.valid("query");

    // need to implement check for proper auth/permissions here
    // e.x. only admins can get all responses of a form, users can only get their own
    try {
      const responses = await getAllFormResponses(
        seasonCode,
        query.formId,
        query.userId,
      );
      return c.json(responses);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 500);
    }
  },
);

const postNewResponseDescription = {
  description: "Post a new form response for a season",
  responses: {
    200: {
      description: "Successful response",
      // no response body (just a status code should suffice)
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: resolver(
            z.object({
              message: z.string(),
              responseErrors: z.array(z.string()).optional(),
            }),
          ),
        },
      },
    },
  },
};

formResponsesRoute.post(
  "/seasons/:seasonCode/forms/:formId/responses",
  describeRoute(postNewResponseDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.uuid() }),
  ),
  validator(
    "json",
    z.object({
      sessionToken: z.string(),
      responseJson: z.json(),
      isSubmitted: z.boolean(),
    }),
  ),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const userId = body.sessionToken; // would instead be extracted from sessionToken in actual implementation

    const validationErrors = validateFormResponseJson(params.formId, body);
    if (validationErrors.length > 0) {
      return c.json(
        {
          message: "Invalid form response data",
          responseErrors: validationErrors,
        },
        400,
      );
    }

    try {
      await updateFormResponse(
        params.seasonCode,
        userId,
        params.formId,
        body.responseJson,
        body.isSubmitted,
      );
      return c.status(200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 500);
    }
  },
);

export default formResponsesRoute;
