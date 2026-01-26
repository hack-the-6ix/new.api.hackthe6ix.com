/**
 * Form question seed data
 */
import { FORM_1_ID, FORM_2_ID } from "./forms";

export const questions = [
  // Form 1 questions (Hacker Application)
  {
    formQuestionId: "firstName",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "profile"],
  },
  {
    formQuestionId: "lastName",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "profile"],
  },
  {
    formQuestionId: "email",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "contact"],
  },

  // Form 2 questions (Workshop Feedback)
  {
    formQuestionId: "workshopName",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required"],
  },
  {
    formQuestionId: "rating",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "number",
    tags: ["required"],
  },
  {
    formQuestionId: "comments",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: [],
  },
];
