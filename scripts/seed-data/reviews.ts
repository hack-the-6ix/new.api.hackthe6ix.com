/**
 * Hacker application review seed data
 */
import { ADMIN_USER_ID } from "./admins";

export const reviews = [
  // Review comparing Alice (b) vs Bob (c)
  {
    seasonCode: "S26",
    winnerId: "b0000000-0000-0000-0000-000000000000", // Alice
    loserId: "c0000000-0000-0000-0000-000000000000", // Bob
    winnerOldScore: 94.0,
    loserOldScore: 86.0,
    winnerNewScore: 95.5,
    loserNewScore: 87.0,
    reviewerId: ADMIN_USER_ID,
    reviewNotes:
      "Both strong candidates, Alice slightly ahead in technical skills",
  },
  // Review comparing Charlie (d) vs Diana (e)
  {
    seasonCode: "S26",
    winnerId: "e0000000-0000-0000-0000-000000000000", // Diana
    loserId: "d0000000-0000-0000-0000-000000000000", // Charlie
    winnerOldScore: 80.0,
    loserOldScore: 79.0,
    winnerNewScore: 82.0,
    loserNewScore: 78.5,
    reviewerId: ADMIN_USER_ID,
    reviewNotes:
      "Very close comparison, Diana's project experience was decisive",
  },
  // Review comparing Bob (c) vs Diana (e)
  {
    seasonCode: "S26",
    winnerId: "c0000000-0000-0000-0000-000000000000", // Bob
    loserId: "e0000000-0000-0000-0000-000000000000", // Diana
    winnerOldScore: 87.0,
    loserOldScore: 82.0,
    winnerNewScore: 87.0,
    loserNewScore: 82.0,
    reviewerId: ADMIN_USER_ID,
    reviewNotes: "Bob has more relevant experience",
  },
  // Review comparing Alice (b) vs Charlie (d)
  {
    seasonCode: "S26",
    winnerId: "b0000000-0000-0000-0000-000000000000", // Alice
    loserId: "d0000000-0000-0000-0000-000000000000", // Charlie
    winnerOldScore: 95.5,
    loserOldScore: 78.5,
    winnerNewScore: 95.5,
    loserNewScore: 78.5,
    reviewerId: ADMIN_USER_ID,
    reviewNotes: "Clear winner, Alice excels in all categories",
  },
];
