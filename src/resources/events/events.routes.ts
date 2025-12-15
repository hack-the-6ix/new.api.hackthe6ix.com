import { Hono } from "hono";
import { z } from "zod";
import { checkInUser, createEvent, fetchEvents } from "./events.service";
import { validator } from "hono-openapi";

const eventBodySchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const checkInBodySchema = z.object({
  userId: z.string().uuid("Invalid userId format"),
  checkInAuthor: z.string().uuid("Invalid checkInAuthor format"),
});

const eventsRoute = new Hono();

// list all events
eventsRoute.get("/seasons/:seasonCode/events", async (c) => {
  const seasonCode = c.req.param("seasonCode");
  try {
    const events = await fetchEvents(seasonCode);
    return events.length
      ? c.json({ data: events })
      : c.json({ message: "No events found" }, 404);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch events";
    return c.json({ message }, 400);
  }
});

// create new event
eventsRoute.post(
  "/seasons/:seasonCode/events",
  validator("json", eventBodySchema),
  async (c) => {
    const seasonCode = c.req.param("seasonCode");
    const body = c.req.valid("json");

    try {
      const result = await createEvent(
        seasonCode,
        body.eventName,
        body.startTime,
        body.endTime,
      );

      return result
        ? c.json({ message: "Event created successfully", data: result }, 201)
        : c.json({ message: "Event already exists" }, 409);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create event";
      return c.json({ message }, 400);
    }
  },
);

// check in user to event
eventsRoute.post(
  "/seasons/:seasonCode/events/:eventId/check-in",
  validator("json", checkInBodySchema),
  async (c) => {
    const seasonCode = c.req.param("seasonCode");
    const eventId = c.req.param("eventId");
    const body = await c.req.json();

    try {
      const result = await checkInUser(
        seasonCode,
        eventId,
        body.userId,
        body.checkInAuthor,
        body.checkInNotes,
      );
      return result
        ? c.json({ message: "User checked in successfully", data: result }, 200)
        : c.json({ message: "Failed to check in user" }, 500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check in user";
      return c.json({ message }, 400);
    }
  },
);

export default eventsRoute;
