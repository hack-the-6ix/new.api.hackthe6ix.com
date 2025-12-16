import { db } from "@/db";
import { admin, hacker, sponsor, mentor, volunteer } from "@/db/schema";
import { handleDbError } from "@/db/utils/dbErrorUtils";
import { eq, and } from "drizzle-orm";
import { ApiError } from "./errors";
import { createMiddleware } from "hono/factory";
import { Context } from "hono";

/**
 * All user roles in the system
 * NOTE: "user" is a default role for all authenticated users, "public" is for unauthenticated users
 */
export enum UserType {
  User = "user", // all authenticated users
  Public = "public", // any request, authenticated or not
  Admin = "admin", // admin users
  Hacker = "hacker", // season-specific hacker
  Sponsor = "sponsor", // season-specific sponsor
  Mentor = "mentor", // season-specific mentor
  Volunteer = "volunteer", // season-specific volunteer
}

const userTables = {
  [UserType.Hacker]: hacker,
  [UserType.Sponsor]: sponsor,
  [UserType.Mentor]: mentor,
  [UserType.Volunteer]: volunteer,
};

/**
 * Check if a userId belongs to a certain user type. Ideally not called directly, use requireRole middleware instead.
 * @param userId - user ID to check
 * @param userType - user type to check against
 * @returns true if userId belongs to userType, false otherwise
 */
const queryUserType = async (
  userId: string | undefined,
  seasonCode: string | undefined,
  userType: UserType,
): Promise<boolean> => {
  if (userType === UserType.Public) return true;

  // if no userId provided, cannot be any authenticated user type
  if (!userId) return false;

  if (userType === UserType.User) return true; // TODO: check if userId exists in system

  // need to check admin table separately since admins are not season-specific (NOTE: this feels bad for consistency, would it be better to have season-specific admins?)
  if (userType === UserType.Admin) {
    // check if user is an admin
    try {
      const res = await db.select().from(admin).where(eq(admin.userId, userId));
      return res.length > 0; // check if matching entry exists
    } catch (error) {
      throw handleDbError(error);
    }
  }

  if (!seasonCode) return false; // seasonCode is required for other user types

  const table = userTables[userType];
  if (!table) return false; // unknown user type, errors should be caught by typescript on compilation before this happens

  try {
    const res = await db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), eq(table.seasonCode, seasonCode)));
    return res.length > 0; // check if matching entry exists
  } catch (error) {
    throw handleDbError(error);
  }
};

/**
 * Middleware to require user has at least one of the specified roles on a route
 * Throws 403 Unauthorized if user doesn't have any of the required roles
 * @param userTypes - Array of allowed user types
 */
export const requireRoles = (...userTypes: UserType[]) => {
  return createMiddleware(async (c, next) => {
    // get userId from context (set by validateSession middleware)
    if (UserType.Public in userTypes) {
      // public access allowed, no need to check further
      await next();
      return;
    }

    if (!c.get("userId")) {
      c.set("userId", await getUserId(c));
    }

    // check each role in parallel
    const roleChecks = await Promise.all(
      userTypes.map(async (type) => isUserType(c, type)),
    );

    // check if any role check passed
    const hasAnyRole = roleChecks.some(Boolean);

    if (!hasAnyRole) {
      throw new ApiError(403, {
        code: "FORBIDDEN",
        message: "You do not have authorization access",
        detail: `Required role(s): ${userTypes.join(", ")}`,
        suggestion: "Check your user type",
      });
    }

    await next();
  });
};

// Mocking this function for now
export const getUserId = async (c: Context) => {
  if (c.get("userId")) {
    return c.get("userId");
  }

  const sessionToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!sessionToken) {
    return undefined;
  }

  try {
    const userId = sessionToken; // TODO: extract userId from sessionToken properly with cognito
    c.set("userId", userId); // cache in context for future use
    return userId;
  } catch {
    // do nothing, treat request as unauthenticated
    return undefined;
  }
};

/**
 * Check if the request is from a certain user type.
 * @param c - Hono context
 * @param userType - UserType to check (e.g., UserType.Admin, UserType.Hacker, etc.)
 * @returns true if user is admin, false otherwise
 */
export const isUserType = async (
  c: Context,
  userType: UserType,
): Promise<boolean> => {
  console.log("isUserType check for", userType);
  // check if already cached in context, don't want to query DB multiple times per request
  const cachedValue = c.get(userType);
  if (typeof cachedValue === "boolean") {
    return cachedValue;
  }

  const userId = c.get("userId");
  const seasonCode = c.req.param("seasonCode");

  // queryUserType handles undefined userId and seasonCode cases properly
  const res = await queryUserType(userId, seasonCode, userType);

  // set cache in context for future calls in same request
  c.set(userType, res);
  return res;
};
