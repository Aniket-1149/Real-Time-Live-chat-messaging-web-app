import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./helpers";

// ─── Get current user ──────────────────────────────────────────────────────

/**
 * Returns the Convex user record for the currently authenticated Clerk user.
 * Returns null if the user has not been synced yet (webhook pending).
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Returns a user profile by their Convex ID.
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

/**
 * Returns all users except the caller — used for "start new conversation" search.
 * Filters by name/email prefix; empty query returns all other users.
 */
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }) => {
    const callerId = await getAuthUserId(ctx);
    const all = await ctx.db.query("users").collect();
    const q = searchQuery.toLowerCase().trim();
    return all.filter(
      (u: any) =>
        u._id !== callerId &&
        (q === "" ||
          u.name.toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q))
    );
  },
});

// ─── Upsert user (called from Clerk webhook) ──────────────────────────────

/**
 * Creates or updates the Convex user record from a Clerk webhook payload.
 * Called server-side from the /api/webhooks/clerk route handler.
 * Does NOT write presence — the client heartbeat hook handles that separately.
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, { clerkId, name, email, imageUrl }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, imageUrl });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId,
      name,
      email,
      imageUrl,
    });

    // Bootstrap a presence row so queries never have to handle "missing presence"
    await ctx.db.insert("presence", {
      userId,
      status: "offline",
      lastSeenAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Marks the user as offline (and keeps the profile row) when deleted from Clerk.
 */
export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) return;

    // Set presence to offline
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (presence) {
      await ctx.db.patch(presence._id, { status: "offline", lastSeenAt: Date.now() });
    }
  },
});

/**
 * Updates the current user's display name and/or avatar.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { displayName, imageUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const patch: Record<string, any> = {};
    if (displayName !== undefined) patch.displayName = displayName;
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;

    await ctx.db.patch(userId, patch);
  },
});
