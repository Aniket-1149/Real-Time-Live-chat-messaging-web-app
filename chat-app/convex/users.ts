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
 * Called server-side from /api/webhooks/clerk — no auth context required.
 *
 * Fields synced from Clerk:
 *   clerkId      — stable Clerk user ID (never changes)
 *   name         — first + last name, falls back to username or "User"
 *   displayName  — Clerk username (shown instead of name in the UI when set)
 *   email        — primary email address
 *   imageUrl     — profile picture; falls back to DiceBear avatar
 *   lastSeenAt   — seeded with Clerk account created_at on first sync,
 *                  then maintained by the client heartbeat hook
 *
 * On CREATE: also bootstraps a presence row (status=offline, lastSeenAt now)
 *            so queries never have to handle a missing presence row.
 * On UPDATE: only patches fields that have actually changed to minimise
 *            invalidating reactive subscriptions.
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    email: v.string(),
    imageUrl: v.string(),
    /** Unix ms — Clerk's user.created_at; used to seed presence.lastSeenAt */
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, name, displayName, email, imageUrl, createdAt }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      // Diff: only write fields that changed to avoid unnecessary fan-outs
      const patch: Record<string, any> = {};
      if (existing.name !== name)               patch.name = name;
      if ((existing.displayName ?? null) !== (displayName ?? null))
                                                patch.displayName = displayName;
      if (existing.email !== email)             patch.email = email;
      if (existing.imageUrl !== imageUrl)       patch.imageUrl = imageUrl;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }

      return existing._id;
    }

    // ── First-time sync ───────────────────────────────────────────────────
    const userId = await ctx.db.insert("users", {
      clerkId,
      name,
      ...(displayName ? { displayName } : {}),
      email,
      imageUrl,
    });

    // Bootstrap presence — idempotent guard in case of duplicate webhooks
    const existingPresence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    if (!existingPresence) {
      await ctx.db.insert("presence", {
        userId,
        status: "offline",
        // Seed with Clerk account creation time so "last seen" is meaningful
        // from day one, even before the user opens the app.
        lastSeenAt: createdAt ?? Date.now(),
      });
    }

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
