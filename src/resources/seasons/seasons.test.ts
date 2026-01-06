import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createSeason,
  getSeasonDetails,
} from "@/resources/seasons/seasons.service";
import { db } from "@/db";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { season } from "@/db/schema/season";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema/season", () => ({
  season: {},
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn(),
}));

describe("createSeason", () => {
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

  it("returns true when insert succeeds", async () => {
    // setup
    returningMock.mockResolvedValue([{ seasonId: "123" }]);

    // exercise
    const result = await createSeason("S26");

    // verify
    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(season);
  });

  it("returns false when onConflictDoNothing causes no rows to insert", async () => {
    // setup
    returningMock.mockResolvedValue([]);

    // exercise
    const result = await createSeason("S26");

    // verify
    expect(result).toBe(false);
  });

  it("throws wrapped db error", async () => {
    // setup
    const error = new Error("db failed");
    const apiError = new Error("DB_BAD");

    // exercise - simulate DB throwing
    returningMock.mockRejectedValue(error);

    // verify
    (handleDbError as Mock).mockReturnValue(apiError);
    await expect(createSeason("S26")).rejects.toThrow("DB_BAD");
  });
});

describe("getSeasonDetails", () => {
  const mockSeasonCode = "2026";
  let mockSelect: Mock;
  let mockFrom: Mock;
  let mockWhere: Mock;
  let mockLimit: Mock;

  beforeEach(() => {
    vi.resetAllMocks();

    mockLimit = vi.fn();
    mockWhere = vi.fn(() => ({ limit: mockLimit }));
    mockFrom = vi.fn(() => ({ where: mockWhere }));
    mockSelect = vi.fn(() => ({ from: mockFrom }));

    (db.select as Mock) = mockSelect;
  });

  it("returns a season record when found", async () => {
    const mockRecord = { seasonCode: mockSeasonCode, name: "Test Season" };
    mockLimit.mockResolvedValue([mockRecord]);

    const result = await getSeasonDetails(mockSeasonCode);

    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(result).toEqual(mockRecord);
  });

  it("returns null when no season is found", async () => {
    mockLimit.mockResolvedValue([undefined]); // first item missing

    const result = await getSeasonDetails(mockSeasonCode);

    expect(result).toBeNull();
  });

  it("throws an error with formatted db message when db call fails", async () => {
    mockLimit.mockRejectedValue(new Error("raw db error"));

    (handleDbError as Mock).mockReturnValue({
      message: "formatted db error",
    });

    await expect(getSeasonDetails(mockSeasonCode)).rejects.toThrow(
      "formatted db error"
    );

    expect(handleDbError).toHaveBeenCalled();
  });
});
