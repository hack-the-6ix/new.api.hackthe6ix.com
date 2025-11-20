import { Hono } from "hono";
import seasonsRoute from "@/resources/seasons/seasons.routes";

const api = new Hono();

api.route("/seasons", seasonsRoute);
api.get("/", (c) => c.json({ message: "Hello HT6 API!" }));

export default api;
