import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler, resolver } from "hono-openapi";
import { errorResponseSchema } from "@/lib/errors";

const configureOpenAPI = (app: Hono) => {
  app.get(
    "/docs",
    Scalar({
      url: "/docs/openapi.json",
      theme: "bluePlanet",
      layout: "modern",
      defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
    }),
  );

  app.get(
    "/docs/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "HT6 API",
          version: "1.0.0",
          description: "New HT6 Backend API :]",
        },
        servers: [
          { url: "http://localhost:3000", description: "Local Server" },
        ],
      },
    }),
  );
};

export const genericErrorResponse = (errorCode: number) => {
  const descriptionMap: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
  };

  return {
    [errorCode]: {
      description: descriptionMap[errorCode] || "Error",
      content: {
        "application/json": { schema: resolver(errorResponseSchema) },
      },
    },
  };
};

export default configureOpenAPI;
