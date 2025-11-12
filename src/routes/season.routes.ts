import { Hono } from "hono";

const seasonRoute = new Hono();

seasonRoute.get("/", (c) => c.json({ message: "Hello season!" }));

export default seasonRoute;
