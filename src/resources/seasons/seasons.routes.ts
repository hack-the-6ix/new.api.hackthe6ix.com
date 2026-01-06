import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import {
  createSeason,
  getSeasonDetails,
} from "@/resources/seasons/seasons.service";

import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";
import { requireRoles, UserType } from "@/lib/auth";

const seasonsRoute = new Hono();

const seasonBodySchemaOrParam = z.object({
  seasonCode: z.string().length(3),
});

const seasonResponseSchema = z.object({
  message: z.string(),
});

const seasonSchema = z.object({
  seasonId: z.guid(),
  seasonCode: z.string().length(3),
  hackerApplicationFormId: z.guid(),
  rsvpFormId: z.guid(),
});

const createSeasonResponse = {
  summary: "Create a new season",
  tags: ["Seasons"],
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

seasonsRoute.post(
  "/seasons",
  describeRoute(createSeasonResponse),
  validator("json", seasonBodySchemaOrParam),
  requireRoles(UserType.Admin),
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
  }
);

const getSeasonDetailResponse = {
  summart: "Get season details",
  description:
    "Get a specific season's detail based on seasonCode (Admin only)",
  tags: ["Seasons"],
  responses: {
    200: {
      description: "Successful season details retreival",
      content: {
        "application/json": {
          schema: resolver(seasonSchema),
        },
      },
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(401),
  },
};

seasonsRoute.get(
  "/seasons/:seasonCode",
  describeRoute(getSeasonDetailResponse),
  validator("param", seasonBodySchemaOrParam),
  requireRoles(UserType.Admin),
  async (c) => {
    const seasonCode = c.req.valid("param").seasonCode;

    const response = await getSeasonDetails(seasonCode);
    return c.json(response);
  }
);

export default seasonsRoute;
