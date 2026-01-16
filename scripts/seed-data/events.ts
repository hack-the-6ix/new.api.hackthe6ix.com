/**
 * Event seed data
 */
import { makeDate } from "./helpers";

export const EVENT_1_ID = "e0000000-0000-0000-0000-000000000001";
export const EVENT_2_ID = "e0000000-0000-0000-0000-000000000002";
export const EVENT_3_ID = "e0000000-0000-0000-0000-000000000003";

export const events = [
  {
    seasonCode: "S26",
    eventId: EVENT_1_ID,
    eventName: "Opening Ceremony",
    startTime: makeDate(2026, 3, 15, 18, 0),
    endTime: makeDate(2026, 3, 15, 19, 0),
  },
  {
    seasonCode: "S26",
    eventId: EVENT_2_ID,
    eventName: "Tech Workshops",
    startTime: makeDate(2026, 3, 16, 10, 0),
    endTime: makeDate(2026, 3, 16, 16, 0),
  },
  {
    seasonCode: "S26",
    eventId: EVENT_3_ID,
    eventName: "Final Presentations",
    startTime: makeDate(2026, 3, 16, 16, 0),
    endTime: makeDate(2026, 3, 16, 18, 0),
  },
];
