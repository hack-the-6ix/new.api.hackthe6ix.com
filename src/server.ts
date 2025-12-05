import { Hono } from "hono";
import api from "./api";
import configureOpenAPI from "./config/openapi";
import { handleError } from "@/lib/errors";

const app = new Hono();

app.onError(handleError);

app.route("/api", api);
app.get("/", (c) => c.json({ message: "Hello HT6!" }));

configureOpenAPI(app);

export default app;
