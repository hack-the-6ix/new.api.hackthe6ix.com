import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";

const responseSchema = z.object({
  message: z.string(),
});

const seasonRoute = new Hono();

seasonRoute.get(
  "/",
  describeRoute({
    description: "Season hello world",
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": { schema: resolver(responseSchema) },
        },
      },
    },
  }),
  (c) => c.json({ message: "Hello season!" }),
);

export default seasonRoute;
