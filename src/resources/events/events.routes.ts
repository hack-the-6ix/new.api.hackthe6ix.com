import { Hono } from "hono";
import { z } from "zod";
import { checkInUser, createEvent, fetchEvents } from "./events.service";
import { validator, describeRoute } from "hono-openapi";
import { ApiError } from "@/lib/errors";
import { genericErrorResponse } from "@/config/openapi";

const eventBodySchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
});

const checkInBodySchema = z.object({
  userId: z.uuid("Invalid userId format"),
  checkInAuthor: z.uuid("Invalid checkInAuthor format"),
  checkInNotes: z.string().optional(),
});

const eventsRoute = new Hono();

const getEventsDescription = {
  summary: "Get Events",
  description: "Get all events for a season",
  tags: ["Events"],
  responses: {
    200: {
      description: "Successful response",
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(404),
  },
};

// List all events
eventsRoute.get(
  "/seasons/:seasonCode/events",
  describeRoute(getEventsDescription),
  async (c) => {
    const seasonCode = c.req.param("seasonCode");

    const response = await fetchEvents(seasonCode);

    if (!response) {
      throw new ApiError(404, {
        code: "NO_EVENTS_FOUND",
        message: "No events found",
        suggestion: "Verify the seasonCode is correct.",
      });
    }
    return c.json(response);
  },
);

const createEventDescription = {
  summary: "Create Event",
  description: "Create a new event for a season",
  tags: ["Events"],
  responses: {
    201: {
      description: "Event created",
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(409),
  },
};

// Create new event
eventsRoute.post(
  "/seasons/:seasonCode/events",
  describeRoute(createEventDescription),
  validator("json", eventBodySchema),

  async (c) => {
    const seasonCode = c.req.param("seasonCode");
    const body = c.req.valid("json");

    const result = await createEvent(
      seasonCode,
      body.eventName,
      body.startTime,
      body.endTime,
    );

    if (!result) {
      throw new ApiError(409, {
        code: "EVENT_ALREADY_EXISTS",
        message: "Event already exists",
        suggestion:
          "Ensure you are creating a new event with a different name.",
      });
    }
    return c.json(result);
  },
);

const checkInDescription = {
  summary: "Check In User",
  description: "Check a user into an event",
  tags: ["Events"],
  responses: {
    200: {
      description: "Successful check-in",
    },
    ...genericErrorResponse(500),
    ...genericErrorResponse(404),
  },
};

// check in user to event
eventsRoute.post(
  "/seasons/:seasonCode/events/:eventId/check-in",
  describeRoute(checkInDescription),
  validator("json", checkInBodySchema),
  async (c) => {
    const seasonCode = c.req.param("seasonCode");
    const eventId = c.req.param("eventId");
    const body = await c.req.valid("json");

    const response = await checkInUser(
      seasonCode,
      eventId,
      body.userId,
      body.checkInAuthor,
      body.checkInNotes,
    );

    if (!response) {
      throw new ApiError(500, {
        code: "USER_CHECKIN_FAILED",
        message: "Failed to check in user",
        suggestion: "Ensure correct userId is provided.",
      });
    }
    return c.json(response);
  },
);

export default eventsRoute;
