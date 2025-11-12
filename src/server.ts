import { Hono } from "hono";
import api from "./api";

const app = new Hono();

app.route("/api", api);

app.get("/", (c) => c.json({ message: "Hello HT6!" }));
