import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  fetchEvents,
  createEvent,
  checkInUser,
} from "@/resources/events/events.service";
import { db } from "@/db";
import { getDbErrorMessage } from "@/db/utils/dbErrorUtils";
import { event } from "@/db/schema/event";
import { eventCheckIn } from "@/db/schema/eventCheckIn";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema/event", () => ({
  event: {},
}));

vi.mock("@/db/schema/eventCheckIn", () => ({
  eventCheckIn: {},
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  getDbErrorMessage: vi.fn(),
}));

describe("fetchEvents", () => {
  let selectMock: Mock;
  let whereMock: Mock;

  beforeEach(() => {
    whereMock = vi.fn();
    selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: whereMock,
      })),
    }));
    (db.select as Mock) = selectMock;
    vi.clearAllMocks();
  });

  it("returns events when query succeeds", async () => {
    // setup
    whereMock.mockResolvedValue([{ eventId: "123", eventName: "Hackathon" }]);

    // exercise
    const result = await fetchEvents("SPR");

    // verify
    expect(result).toEqual([{ eventId: "123", eventName: "Hackathon" }]);
    expect(selectMock).toHaveBeenCalled();
  });

  it("throws wrapped db error", async () => {
    // setup
    const error = new Error("db failed");
    whereMock.mockRejectedValue(error);

    // verify
    (getDbErrorMessage as Mock).mockReturnValue({
      message: "DB_BAD",
    });
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
      values: vi.fn(() => ({
        onConflictDoNothing: onConflictMock,
      })),
    }));
    (db.insert as Mock) = insertMock;
    vi.clearAllMocks();
  });

  it("returns the created event when insert succeeds", async () => {
    // setup
    returningMock.mockResolvedValue([
      { eventId: "123", eventName: "Hackathon" },
    ]);

    // exercise
    const result = await createEvent(
      "SPR",
      "123",
      "Hackathon",
      "2025-11-27T10:00:00Z",
      "2025-11-27T12:00:00Z",
    );

    // verify
    expect(result).toEqual({ eventId: "123", eventName: "Hackathon" });
    expect(insertMock).toHaveBeenCalledWith(event);
  });

  it("returns null when onConflictDoNothing causes no rows to insert", async () => {
    // setup
    returningMock.mockResolvedValue([]);

    // exercise
    const result = await createEvent(
      "SPR",
      "123",
      "Hackathon",
      "2025-11-27T10:00:00Z",
      "2025-11-27T12:00:00Z",
    );

    // verify
    expect(result).toBeNull();
  });

  it("throws wrapped db error", async () => {
    // setup
    const error = new Error("db failed");
    returningMock.mockRejectedValue(error);

    // verify
    (getDbErrorMessage as Mock).mockReturnValue({
      message: "DB_BAD",
    });
    await expect(
      createEvent(
        "SPR",
        "123",
        "Hackathon",
        "2025-11-27T10:00:00Z",
        "2025-11-27T12:00:00Z",
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
      values: vi.fn(() => ({
        onConflictDoUpdate: onConflictMock,
      })),
    }));
    (db.insert as Mock) = insertMock;
    vi.clearAllMocks();
  });

  it("returns the check-in record when insert succeeds", async () => {
    // setup
    returningMock.mockResolvedValue([{ eventCheckInId: "123", userId: "456" }]);

    // exercise
    const result = await checkInUser(
      "SPR",
      "123",
      "456",
      "789",
      "Checked in early",
    );

    // verify
    expect(result).toEqual({ eventCheckInId: "123", userId: "456" });
    expect(insertMock).toHaveBeenCalledWith(eventCheckIn);
  });

  it("throws wrapped db error", async () => {
    // setup
    const error = new Error("db failed");
    returningMock.mockRejectedValue(error);

    // verify
    (getDbErrorMessage as Mock).mockReturnValue({
      message: "DB_BAD",
    });
    await expect(
      checkInUser("SPR", "123", "456", "789", "Checked in early"),
    ).rejects.toThrow("DB_BAD");
  });
});
