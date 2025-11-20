import { Hono } from "hono";
import { z } from "zod";
import { fetchEvents } from "./events.service";

const createSeasonBodySchema = z.object({
  seasonCode: z.string().length(3),
});

const eventsRoute = new Hono();

eventsRoute.get("/seasons/:seasonCode/events", async (c) => {
  const seasonCode = c.req.param("seasonCode");

  const parsed = createSeasonBodySchema.safeParse({ seasonCode });
  if (!parsed.success) {
    return c.json({ message: "Invalid seasonCode" }, 400);
  }

  try {
    const res = await fetchEvents(parsed.data.seasonCode);
    if (res) {
      return c.json({
        message: `Events from ${parsed.data.seasonCode} requested!`,
        data: res,
      });
    }
    return c.json({ message: "No events found for the given seasonCode" }, 404);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ message }, 500);
  }
});

// eventsRoute.post("/seasons/:seasonCode/events:eventId", async (c) => {
//   const seasonCode = c.req.param("seasonCode");
//   const eventId = c.req.param("eventId");
// });

export default eventsRoute;
