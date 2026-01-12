import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({ handleDbError: vi.fn() }));

import {
  fetchEvents,
  createEvent,
  checkInUser,
} from "@/resources/events/events.service";
import { db } from "@/db";
import { handleDbError } from "@/db/utils/dbErrorUtils";

describe("fetchEvents", () => {
  let mockSelect: Mock;
  let mockFrom: Mock;
  let mockWhere: Mock;

  beforeEach(() => {
    vi.resetAllMocks();
    mockWhere = vi.fn();
    mockFrom = vi.fn(() => ({ where: mockWhere }));
    mockSelect = vi.fn(() => ({ from: mockFrom }));
    (db.select as Mock) = mockSelect;
  });

  it("returns events when found", async () => {
    mockWhere.mockResolvedValue([{ eventId: "e1" }]);
    const res = await fetchEvents("SPR");
    expect(res).toEqual([{ eventId: "e1" }]);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("throws wrapped db error", async () => {
    mockWhere.mockRejectedValue(new Error("raw db"));
    (handleDbError as Mock).mockReturnValue(new Error("DB_BAD"));
    await expect(fetchEvents("SPR")).rejects.toThrow("DB_BAD");
  });
});

describe("createEvent", () => {
  let insertMock: Mock;
  let onConflictMock: Mock;
  let returningMock: Mock;

  beforeEach(() => {
    returningMock = vi.fn();
    onConflictMock = vi.fn(() => ({ returning: returningMock }));
    insertMock = vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: onConflictMock })),
    }));
    (db.insert as Mock) = insertMock;
  });

  it("returns the created event when insert succeeds", async () => {
    returningMock.mockResolvedValue([
      { eventId: "123", eventName: "Hackathon" },
    ]);

    const result = await createEvent(
      "SPR",
      "Hackathon",
      new Date("2025-11-27T10:00:00Z"),
      new Date("2025-11-27T12:00:00Z"),
    );

    expect(result).toEqual({ eventId: "123", eventName: "Hackathon" });
    expect(insertMock).toHaveBeenCalled();
  });

  it("returns null when onConflictDoNothing causes no rows to insert", async () => {
    returningMock.mockResolvedValue([]);
    const result = await createEvent("SPR", "Hackathon", null, null);
    expect(result).toBeNull();
  });

  it("throws wrapped db error", async () => {
    returningMock.mockRejectedValue(new Error("db failed"));
    (handleDbError as Mock).mockReturnValue(new Error("DB_BAD"));
    await expect(
      createEvent(
        "SPR",
        "Hackathon",
        new Date("2025-11-27T10:00:00Z"),
        new Date("2025-11-27T12:00:00Z"),
      ),
    ).rejects.toThrow("DB_BAD");
  });
});

describe("checkInUser", () => {
  let insertMock: Mock;
  let onConflictMock: Mock;
  let returningMock: Mock;

  beforeEach(() => {
    returningMock = vi.fn();
    onConflictMock = vi.fn(() => ({ returning: returningMock }));
    insertMock = vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoUpdate: onConflictMock })),
    }));
    (db.insert as Mock) = insertMock;
  });

  it("returns the check-in record when insert succeeds", async () => {
    returningMock.mockResolvedValue([{ eventCheckInId: "123", userId: "456" }]);
    const result = await checkInUser(
      "SPR",
      "123",
      "456",
      "789",
      "Checked in early",
    );
    expect(result).toEqual({ eventCheckInId: "123", userId: "456" });
    expect(insertMock).toHaveBeenCalled();
  });

  it("throws wrapped db error", async () => {
    returningMock.mockRejectedValue(new Error("db failed"));
    (handleDbError as Mock).mockReturnValue(new Error("DB_BAD"));
    await expect(
      checkInUser("SPR", "123", "456", "789", "Checked in early"),
    ).rejects.toThrow("DB_BAD");
  });

  it("passes null for checkInNotes when not provided", async () => {
    returningMock.mockResolvedValue([{ eventCheckInId: "123", userId: "456" }]);
    const res = await checkInUser("SPR", "123", "456", "789");
    expect(res).toEqual({ eventCheckInId: "123", userId: "456" });
  });
});
