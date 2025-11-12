import { Hono } from "hono";
import seasonRoutes from "@/routes/season.routes";

const api = new Hono();

api.route("/season", seasonRoutes);

api.get("/", (c) => c.json({ message: "Hello HT6 API!" }));

export default api;
