import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { createForm } from "@/resources/form/forms.service";

// TODO: Add admin authentication middleware
// const adminAuth = async (c, next) => {
//   // Verify user is admin
//   await next();
// };

const createFormBodySchema = z.object({
  openTime: z.string().datetime().optional().nullable(),
  closeTime: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

// idk how this is supposed to look
const formSchema = z.object({
  formId: z.string().uuid(),
  seasonCode: z.string().length(3),
  openTime: z.string().datetime().nullable(),
  closeTime: z.string().datetime().nullable(),
  tags: z.array(z.string()),
});

const createFormResponse = {
  description: "Create a new form for a season (Admin Only)",
  responses: {
    200: {
      description: "Form created successfully",
      content: {
        "application/json": { schema: resolver(formSchema) },
      },
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

const formsRoute = new Hono();

formsRoute.post(
  "/seasons/:seasonCode/forms",
  describeRoute(createFormResponse),
  validator("json", createFormBodySchema),
  async (c) => {
    const seasonCode = c.req.param("seasonCode");
    const body = c.req.valid("json");

    try {
      const form = await createForm({
        seasonCode,
        openTime: body.openTime ? new Date(body.openTime) : null,
        closeTime: body.closeTime ? new Date(body.closeTime) : null,
        tags: body.tags,
      });

      return c.json({
        formId: form.formId,
        seasonCode: form.seasonCode ?? "",
        openTime: form.openTime?.toISOString() ?? null,
        closeTime: form.closeTime?.toISOString() ?? null,
        tags: form.tags,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ message }, 400);
    }
  },
);

export default formsRoute;
