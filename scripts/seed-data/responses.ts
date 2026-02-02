/**
 * Form response seed data
 */
import { FORM_1_ID, FORM_2_ID } from "./forms";

export const responses = [
  // Form 1 responses (Hacker Application)
  {
    formId: FORM_1_ID,
    userId: "b0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      firstName: { data: "Alice" },
      lastName: { data: "Johnson" },
      email: { data: "alice@example.com" },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_1_ID,
    userId: "c0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      firstName: { data: "Bob" },
      lastName: { data: "Smith" },
      email: { data: "bob@example.com" },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_1_ID,
    userId: "d0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      firstName: { data: "Charlie" },
      lastName: { data: "Davis" },
      email: { data: "charlie@example.com" },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_1_ID,
    userId: "e0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      firstName: { data: "Diana" },
      lastName: { data: "Martinez" },
      email: { data: "diana@example.com" },
    },
    isSubmitted: false,
  },

  // Form 2 responses (Workshop Feedback)
  {
    formId: FORM_2_ID,
    userId: "b0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      workshopName: { data: "Intro to React" },
      rating: { data: "5" },
      comments: { data: "Great workshop! Very informative." },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_2_ID,
    userId: "c0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      workshopName: { data: "Machine Learning Basics" },
      rating: { data: "4" },
      comments: { data: "Good content, but could use more examples." },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_2_ID,
    userId: "d0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      workshopName: { data: "Web Security" },
      rating: { data: "5" },
      comments: { data: "Excellent presentation!" },
    },
    isSubmitted: true,
  },
  {
    formId: FORM_2_ID,
    userId: "e0000000-0000-0000-0000-000000000000",
    seasonCode: "S26",
    responseJson: {
      workshopName: { data: "API Design" },
      rating: { data: "3" },
      comments: { data: "" },
    },
    isSubmitted: true,
  },
];
