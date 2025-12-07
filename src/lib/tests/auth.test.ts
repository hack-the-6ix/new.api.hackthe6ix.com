import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { isAdmin } from "../auth";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  admin: {
    userId: "userId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

describe("isAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when user is an admin", async () => {
    const selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ userId: "admin-user-id" }]),
      })),
    }));
    (db.select as Mock) = selectMock;

    const result = await isAdmin("admin-user-id");

    expect(result).toBe(true);
    expect(selectMock).toHaveBeenCalled();
  });

  it("should return false when user is not an admin", async () => {
    const selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    }));
    (db.select as Mock) = selectMock;

    const result = await isAdmin("regular-user-id");

    expect(result).toBe(false);
    expect(selectMock).toHaveBeenCalled();
  });
});
