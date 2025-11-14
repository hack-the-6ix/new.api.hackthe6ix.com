import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { createSeason } from "@/services/seasons.service";

const createSeasonBodySchema = z.object({
  seasonCode: z.string().length(3),
});

const seasonResponseSchema = z.object({
  message: z.string(),
});

const createSeasonResponse = {
  description: "Create a new season",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": { schema: resolver(seasonResponseSchema) },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": { schema: resolver(seasonResponseSchema) },
      },
    },
  },
};

const seasonsRoute = new Hono();

seasonsRoute.post(
  "/",
  describeRoute(createSeasonResponse),
  validator("json", createSeasonBodySchema),
  async (c) => {
    const query = c.req.valid("json");

    try {
      const res = await createSeason(query.seasonCode);
      if (res) {
        return c.json({ message: "success" });
      }
      return c.json({ message: "Conflicting seasonCode" }, 400);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 400);
    }
  },
);

export default seasonsRoute;
