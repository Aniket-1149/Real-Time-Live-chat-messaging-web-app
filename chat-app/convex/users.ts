import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./helpers";

// ─── Get current user ──────────────────────────────────────────────────────

/**
 * Returns the Convex user record for the currently authenticated Clerk user.
 * Returns null if the user is not yet synced.
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
 * Returns a user by their Convex ID.
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

/**
 * Returns all users except the caller — used for "start new conversation" search.
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
        (q === "" || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  },
});

// ─── Upsert user (called from Clerk webhook) ──────────────────────────────

/**
 * Creates or updates the Convex user record from Clerk webhook payload.
 * Called server-side from the Clerk webhook route handler.
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

    return await ctx.db.insert("users", {
      clerkId,
      name,
      email,
      imageUrl,
      status: "offline",
      lastSeenAt: Date.now(),
    });
  },
});

/**
 * Marks the user as offline when deleted from Clerk.
 */
export const deleteUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, { status: "offline" });
    }
  },
});

// ─── Presence ──────────────────────────────────────────────────────────────

/**
 * Updates the caller's status and records a heartbeat timestamp.
 * status: "online" | "idle" | "dnd" | "offline"
 */
export const updatePresence = mutation({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, { status, lastSeenAt: Date.now() });
  },
});
