import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

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

export default configureOpenAPI;
