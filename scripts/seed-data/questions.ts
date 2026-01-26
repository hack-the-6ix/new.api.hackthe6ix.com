/**
 * Form question seed data
 */
import { FORM_1_ID, FORM_2_ID } from "./forms";

export const questions = [
  // Form 1 questions (Hacker Application)
  {
    formQuestionRef: "firstName",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "profile"],
  },
  {
    formQuestionRef: "lastName",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "profile"],
  },
  {
    formQuestionRef: "email",
    formId: FORM_1_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required", "contact"],
  },

  // Form 2 questions (Workshop Feedback)
  {
    formQuestionRef: "workshopName",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: ["required"],
  },
  {
    formQuestionRef: "rating",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "number",
    tags: ["required"],
  },
  {
    formQuestionRef: "comments",
    formId: FORM_2_ID,
    seasonCode: "S26",
    questionType: "text",
    tags: [],
  },
];
