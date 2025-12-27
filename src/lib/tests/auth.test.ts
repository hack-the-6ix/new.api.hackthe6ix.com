import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

// Mock env before any imports that might use it
vi.mock("@/config/env", () => ({
  default: {
    NODE_ENV: "test",
    DB_HOST: "localhost",
    DB_USER: "test",
    DB_PASSWORD: "test",
    DB_NAME: "test",
    DB_PORT: 5432,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
  dev: false,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/utils/dbErrorUtils", () => ({
  handleDbError: vi.fn((error) => error),
}));

vi.mock("@/db/schema", () => ({
  admin: {
    userId: "userId",
  },
  hacker: {
    userId: "userId",
    seasonCode: "seasonCode",
  },
  sponsor: {
    userId: "userId",
    seasonCode: "seasonCode",
  },
  mentor: {
    userId: "userId",
    seasonCode: "seasonCode",
  },
  volunteer: {
    userId: "userId",
    seasonCode: "seasonCode",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

import { isUserType, requireRoles, UserType, queryUserType } from "../auth";
import { db } from "@/db";
import { Context } from "hono";

// Mock getUserId for all tests
vi.mock("../auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth")>();
  return {
    ...actual,
    getUserId: vi.fn().mockResolvedValue("user-id"),
  };
});

describe("Auth Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("queryUserType", () => {
    it("should return true for admin when user exists in admin table", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "admin-user-id" }]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const result = await queryUserType(
        "admin-user-id",
        undefined,
        UserType.Admin,
      );

      expect(result).toBe(true);
    });

    it("should return false when user does not exist in table", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const result = await queryUserType("user-id", "S26", UserType.Hacker);

      expect(result).toBe(false);
    });

    it("should return false when seasonCode is missing for season-specific roles", async () => {
      const result = await queryUserType("user-id", undefined, UserType.Hacker);

      expect(result).toBe(false);
    });
  });

  describe("isUserType", () => {
    it("should use cached value when available", async () => {
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === UserType.Admin) return true;
          if (key === "userId") return "user-id";
          return undefined;
        }),
        set: vi.fn(),
        req: { param: vi.fn() },
      } as unknown as Context;

      const result = await isUserType(mockContext, UserType.Admin);

      expect(result).toBe(true);
      // Shouldn't query DB when value is cached
      expect(mockContext.set).not.toHaveBeenCalled();
    });

    it("should query and cache result when not cached", async () => {
      // Note: This tests the actual implementation through the DB layer
      // since queryUserType is called internally and can't be easily mocked
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "user-id" }]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn((key: string) => (key === "userId" ? "user-id" : undefined)),
        set: vi.fn(),
        req: { param: vi.fn(() => "S26") },
      } as unknown as Context;

      const result = await isUserType(mockContext, UserType.Hacker);

      expect(result).toBe(true);
      expect(mockContext.set).toHaveBeenCalledWith(UserType.Hacker, true);
    });
  });

  describe("requireRoles", () => {
    it("should allow access when user has required role", async () => {
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "userId") return "user-id";
          if (key === UserType.Admin) return true; // Cached role check
          return undefined;
        }),
        set: vi.fn(),
        req: { param: vi.fn() },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin);

      await middleware(mockContext, nextMock);

      expect(nextMock).toHaveBeenCalled();
    });

    it("should throw 403 when user lacks required role", async () => {
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "userId") return "user-id";
          if (key === UserType.Admin) return false; // Cached role check
          return undefined;
        }),
        set: vi.fn(),
        req: { param: vi.fn() },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin);

      await expect(middleware(mockContext, nextMock)).rejects.toThrow();
      expect(nextMock).not.toHaveBeenCalled();
    });

    it("should allow access if user has any of multiple roles", async () => {
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "userId") return "user-id";
          if (key === UserType.Admin) return false; // Not admin
          if (key === UserType.Hacker) return true; // Is hacker
          return undefined;
        }),
        set: vi.fn(),
        req: { param: vi.fn().mockReturnValue("S26") },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin, UserType.Hacker);

      await middleware(mockContext, nextMock);

      expect(nextMock).toHaveBeenCalled();
    });
  });
});
