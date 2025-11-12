// src/routes/docs.ts
import { Hono } from "hono";
import { Scalar } from "@scalar/hono-api-reference";
import fs from "node:fs/promises";
import path from "node:path";

const docRoutes = new Hono()
  .get(
    "/",
    Scalar({
      url: "/api/docs/open-api",
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: { targetKey: "js", clientKey: "axios" },
    }),
  )
  .get("/open-api", async (c) => {
    const raw = await fs.readFile(
      path.join(process.cwd(), "./openapi/openapi.json"),
      "utf-8",
    );
    return c.json(JSON.parse(raw));
  });

export type AppType = typeof docRoutes;
export default docRoutes;
