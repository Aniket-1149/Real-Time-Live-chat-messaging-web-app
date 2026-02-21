import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Resolves the current authenticated user's Convex _id from the Clerk JWT.
 *
 * Convex stores the Clerk subject (user ID) in the identity's `subject` field.
 * We look up the matching user row and return its _id.
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
