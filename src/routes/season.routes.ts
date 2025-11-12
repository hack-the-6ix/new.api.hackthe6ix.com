import { Hono } from "hono";

const seasonRoute = new Hono().get("/", (c) =>
  c.json({ message: "Hello season!" }),
);

export type AppType = typeof seasonRoute;
export default seasonRoute;
