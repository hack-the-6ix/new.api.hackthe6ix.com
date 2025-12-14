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

import { isAdmin, requireRoles, UserType } from "../auth";
import { db } from "@/db";
import { Context } from "hono";

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

describe("Auth Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAdmin", () => {
    it("should return true when user is an admin", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "admin-user-id" }]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn((key: string) =>
          key === "userId" ? "admin-user-id" : undefined,
        ),
        set: vi.fn(),
      } as unknown as Context;

      const result = await isAdmin(mockContext);

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

      const mockContext = {
        get: vi.fn((key: string) =>
          key === "userId" ? "regular-user-id" : undefined,
        ),
        set: vi.fn(),
      } as unknown as Context;

      const result = await isAdmin(mockContext);

      expect(result).toBe(false);
    });

    it("should use cached value if available", async () => {
      const selectMock = vi.fn();
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn((key: string) =>
          key === "isAdmin" ? true : "some-user-id",
        ),
        set: vi.fn(),
      } as unknown as Context;

      const result = await isAdmin(mockContext);

      expect(result).toBe(true);
      expect(selectMock).not.toHaveBeenCalled();
    });
  });

  describe("requireRoles", () => {
    it("should allow access when user has required role", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "user-id" }]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn().mockReturnValue("user-id"),
        set: vi.fn(),
        req: {
          param: vi.fn(),
        },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin);

      await middleware(mockContext, nextMock);

      expect(nextMock).toHaveBeenCalled();
    });

    it("should throw 403 when user lacks required role", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn().mockReturnValue("user-id"),
        set: vi.fn(),
        req: {
          param: vi.fn(),
        },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin);

      await expect(middleware(mockContext, nextMock)).rejects.toThrow();
      expect(nextMock).not.toHaveBeenCalled();
    });

    it("should allow access if user has any of multiple roles", async () => {
      // First call for Admin (fails), second call for Hacker (passes)
      let callCount = 0;
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve([]); // Admin check fails
            }
            return Promise.resolve([{ userId: "user-id" }]); // Hacker check passes
          }),
        })),
      }));
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn().mockReturnValue("user-id"),
        set: vi.fn(),
        req: {
          param: vi.fn().mockReturnValue("S26"),
          header: vi.fn(),
        },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin, UserType.Hacker);

      await middleware(mockContext, nextMock);

      expect(nextMock).toHaveBeenCalled();
    });

    it("should always allow Public access", async () => {
      const selectMock = vi.fn();
      (db.select as Mock) = selectMock;

      const mockContext = {
        get: vi.fn(),
        set: vi.fn(),
        req: {
          param: vi.fn(),
          header: vi.fn(),
        },
      } as unknown as Context;

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Public);

      await middleware(mockContext, nextMock);

      expect(nextMock).toHaveBeenCalled();
      expect(selectMock).not.toHaveBeenCalled();
    });

    it("should cache role check results in context", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ userId: "user-id" }]),
        })),
      }));
      (db.select as Mock) = selectMock;

      const contextData = new Map();
      const mockContext = {
        get: vi.fn((key: string) => contextData.get(key)),
        set: vi.fn((key: string, value: unknown) =>
          contextData.set(key, value),
        ),
        req: {
          param: vi.fn(),
        },
      } as unknown as Context;

      contextData.set("userId", "user-id");

      const nextMock = vi.fn();
      const middleware = requireRoles(UserType.Admin);

      await middleware(mockContext, nextMock);

      expect(mockContext.set).toHaveBeenCalledWith(UserType.Admin, true);
    });
  });
});
