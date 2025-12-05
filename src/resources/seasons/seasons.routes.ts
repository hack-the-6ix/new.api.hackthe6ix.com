import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { createSeason } from "@/resources/seasons/seasons.service";
import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";

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
    ...genericErrorResponse(409),
    ...genericErrorResponse(500),
  },
};

const seasonsRoute = new Hono();

seasonsRoute.post(
  "/",
  describeRoute(createSeasonResponse),
  validator("json", createSeasonBodySchema),
  async (c) => {
    const query = c.req.valid("json");
    const res = await createSeason(query.seasonCode);
    if (!res) {
      throw new ApiError(409, {
        code: "CONFLICT",
        message: "Conflicting seasonCode",
      });
    }
    return c.json({ message: "success" });
  },
);

export default seasonsRoute;
