import { Hono } from "hono";
import api from "./api";
import configureOpenAPI from "./config/openapi";

const app = new Hono();
app.route("/api", api);
app.get("/", (c) => c.json({ message: "Hello HT6!" }));

configureOpenAPI(app);

export default app;
