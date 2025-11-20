import { Hono } from "hono";
import seasonsRoute from "@/resources/seasons/seasons.routes";
import formResponsesRoute from "@/resources/form/responses/responses.routes";

const api = new Hono();

api.route("/", seasonsRoute);
api.route("/", formResponsesRoute);

api.get("/", (c) => c.json({ message: "Hello HT6 API!" }));

export default api;
