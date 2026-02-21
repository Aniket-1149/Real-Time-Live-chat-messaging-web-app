import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./helpers";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * A user is considered "online" if their last heartbeat was within this window.
 * Matches the 30 s interval in usePresence.ts.
 */
const ONLINE_THRESHOLD_MS = 60_000; // 2 missed heartbeats → idle

// ─── Get presence for a single user ──────────────────────────────────────

/**
 * Returns the presence row for any given user.
 * Callers subscribe reactively — status updates fan-out in real time.
 */
export const getPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();
  },
});

// ─── Batch get presence ───────────────────────────────────────────────────

/**
 * Returns presence rows for an array of user IDs in one round trip.
 * Used by the conversation list to show status dots alongside each contact.
 */
export const batchGetPresence = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, { userIds }) => {
    const rows = await Promise.all(
      userIds.map((id: any) =>
        ctx.db
          .query("presence")
          .withIndex("by_user", (q: any) => q.eq("userId", id))
          .unique()
      )
    );
    // Return a map of userId → presence so the client can look up O(1)
    const map: Record<string, { status: string; lastSeenAt: number } | null> = {};
    userIds.forEach((id: any, i: any) => {
      map[id] = rows[i] ? { status: rows[i]!.status, lastSeenAt: rows[i]!.lastSeenAt } : null;
    });
    return map;
  },
});

// ─── Get own presence ─────────────────────────────────────────────────────

/**
 * Returns the authenticated user's own presence row.
 * Used on first mount to restore last-known status.
 */
export const getMyPresence = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();
  },
});

// ─── Set presence ────────────────────────────────────────────────────────

/**
 * Upserts the caller's presence row.
 * Called by the usePresence hook:
 *   • on mount            → "online"
 *   • every 30 s          → "online" (heartbeat)
 *   • on visibilitychange → "idle"
 *   • on beforeunload     → "offline"
 *
 * status: "online" | "idle" | "dnd" | "offline"
 */
export const setPresence = mutation({
  args: {
    status: v.string(),
  },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status, lastSeenAt: Date.now() });
    } else {
      // Presence row should have been bootstrapped by upsertUser, but guard
      // here in case of race conditions.
      await ctx.db.insert("presence", {
        userId,
        status,
        lastSeenAt: Date.now(),
      });
    }
  },
});

// ─── Get all online users ─────────────────────────────────────────────────

/**
 * Returns IDs of users who have a recent heartbeat (within ONLINE_THRESHOLD_MS).
 * Useful for an "online members" count in group chats.
 */
export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ONLINE_THRESHOLD_MS;
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_status", (q: any) => q.eq("status", "online"))
      .collect();
    return rows
      .filter((r: any) => r.lastSeenAt > cutoff)
      .map((r: any) => r.userId);
  },
});
