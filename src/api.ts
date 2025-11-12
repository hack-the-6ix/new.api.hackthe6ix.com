import { Hono } from "hono";
import seasonRoutes from "@/routes/season.routes";
import docRoutes from "@/routes/docs.routes";

const api = new Hono()
  .route("/season", seasonRoutes)
  .route("/docs", docRoutes)
  .get("/", (c) => c.json({ message: "Hello HT6 API!" }));

export default api;
