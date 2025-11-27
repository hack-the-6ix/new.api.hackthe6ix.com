import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  getFormResponses,
  validateFormResponseJson,
  upsertFormResponse,
  getRandomFormResponse,
} from "./responses.service";

const formResponsesRoute = new Hono();

const formResponseSchema = z.object({
  formResponseId: z.uuidv7(),
  formId: z.uuidv7(),
  userId: z.uuidv7(),
  seasonCode: z.string().length(3),
  responseJson: z.json(),
  isSubmitted: z.boolean(),
  updatedAt: z.iso.datetime(),
});

const getAllResponsesDescription = {
  description: "Get all form responses for a season",
  tags: ["Form Responses"],
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
      formId: z.uuidv7().optional(),
      userId: z.uuidv7().optional(),
    }),
  ),
  validator("param", z.object({ seasonCode: z.string().length(3) })),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const query = c.req.valid("query");

    // need to implement check for proper auth/permissions here
    // i.e. only admins can get all responses of a form, users can only get their own
    // alt: use middleware to enforce auth/permissions before reaching this point

    try {
      const responses = await getFormResponses(
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

const upsertFormResponseDescription = {
  description: "Upsert a new form response for a certain form",
  tags: ["Form Responses"],
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

// upsert form response
formResponsesRoute.post(
  "/seasons/:seasonCode/forms/:formId/responses",
  describeRoute(upsertFormResponseDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.uuidv7() }),
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
      await upsertFormResponse(
        params.seasonCode,
        userId,
        params.formId,
        body.responseJson,
        body.isSubmitted,
      );
      return c.json({}, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 500);
    }
  },
);

const getRandomFormResponseDescription = {
  description: "Get a random form response for a season",
  tags: ["Form Responses"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(formResponseSchema) },
      },
    },
  },
};

formResponsesRoute.get(
  "/seasons/:seasonCode/forms/:formId/responses/random",
  describeRoute(getRandomFormResponseDescription),
  validator(
    "param",
    z.object({ seasonCode: z.string().length(3), formId: z.uuidv7() }),
  ),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;
    const formId = c.req.valid("param").formId;

    try {
      const response = await getRandomFormResponse(formId, seasonCode);
      if (!response) {
        return c.json({ message: "No form responses found" }, 404);
      }
      return c.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 500);
    }
  },
);

export default formResponsesRoute;
