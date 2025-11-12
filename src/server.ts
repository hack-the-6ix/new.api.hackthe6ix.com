import { Hono } from "hono";
import api from "./api";

const app = new Hono()
  .route("/api", api)
  .get("/", (c) => c.json({ message: "Hello HT6!" }));

export default app;
