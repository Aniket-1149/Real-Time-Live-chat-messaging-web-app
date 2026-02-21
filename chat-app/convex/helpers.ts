import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Resolves the current authenticated user's Convex _id from the Clerk JWT.
 *
 * Returns null when called from an unauthenticated context.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<any> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  return user?._id ?? null;
}

/**
 * Same as getAuthUserId but throws if the user is not authenticated.
 */
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<any> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

/**
 * Returns the full user row for the authenticated caller.
 * Throws if unauthenticated or if the user record does not exist yet.
 *
 * Use this in mutations/queries that need the caller's profile data
 * (name, imageUrl, etc.) in a single helper call.
 */
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx
): Promise<any> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found — webhook may not have synced yet");
  return user;
}

