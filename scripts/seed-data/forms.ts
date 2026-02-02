/**
 * Form seed data
 */
import { makeDate } from "./helpers";

export const FORM_1_ID = "f0000000-0000-0000-0000-000000000001";
export const FORM_2_ID = "f0000000-0000-0000-0000-000000000002";

export const forms = [
  {
    formId: FORM_1_ID,
    seasonCode: "S26",
    name: "Hacker Application",
    openTime: makeDate(2026, 1, 1, 0, 0),
    closeTime: makeDate(2026, 2, 1, 23, 59),
    tags: ["application", "registration"],
  },
  {
    formId: FORM_2_ID,
    seasonCode: "S26",
    name: "Workshop Feedback",
    openTime: makeDate(2026, 3, 15, 10, 0),
    closeTime: makeDate(2026, 3, 16, 18, 0),
    tags: ["feedback"],
  },
];
