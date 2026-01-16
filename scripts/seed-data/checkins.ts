/**
 * Event check-in seed data
 */
import { ADMIN_USER_ID } from "./admins";
import { EVENT_1_ID, EVENT_2_ID, EVENT_3_ID } from "./events";

export const checkins = [
  // Event 1 check-ins (Opening Ceremony)
  {
    seasonCode: "S26",
    eventId: EVENT_1_ID,
    userId: "b0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: "On time",
  },
  {
    seasonCode: "S26",
    eventId: EVENT_1_ID,
    userId: "c0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },
  {
    seasonCode: "S26",
    eventId: EVENT_1_ID,
    userId: "d0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },

  // Event 2 check-ins (Tech Workshops)
  {
    seasonCode: "S26",
    eventId: EVENT_2_ID,
    userId: "b0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: "Attending React workshop",
  },
  {
    seasonCode: "S26",
    eventId: EVENT_2_ID,
    userId: "c0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: "Attending ML workshop",
  },
  {
    seasonCode: "S26",
    eventId: EVENT_2_ID,
    userId: "d0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },
  {
    seasonCode: "S26",
    eventId: EVENT_2_ID,
    userId: "e0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },

  // Event 3 check-ins (Final Presentations)
  {
    seasonCode: "S26",
    eventId: EVENT_3_ID,
    userId: "b0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: "Presenting project",
  },
  {
    seasonCode: "S26",
    eventId: EVENT_3_ID,
    userId: "c0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },
  {
    seasonCode: "S26",
    eventId: EVENT_3_ID,
    userId: "d0000000-0000-0000-0000-000000000000",
    checkInAuthor: ADMIN_USER_ID,
    checkInNotes: null,
  },
];
