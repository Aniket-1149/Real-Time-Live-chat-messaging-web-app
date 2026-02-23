import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./helpers";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * How often the client sends a heartbeat. Must match HEARTBEAT_INTERVAL_MS
 * in usePresence.ts. Exported so backend helpers can reference the same value.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000; // 30 s

/**
 * A presence row is considered stale (user is effectively offline) if its
 * lastSeenAt is older than this window. Equals 3 missed heartbeats.
 * Stale rows still exist in the DB — they are just treated as "offline" on
 * read so we never need a scheduled cleanup job.
 */
export const PRESENCE_EXPIRY_MS = HEARTBEAT_INTERVAL_MS * 3; // 90 s

// ─── Shared helper ────────────────────────────────────────────────────────

/**
 * Derives the effective display status from the stored status + lastSeenAt.
 *
 * A tab that crashed (no `beforeunload` fired) will leave status="online" in
 * the DB indefinitely. This function overrides it with "offline" whenever the
 * heartbeat has expired, regardless of what the stored status field says.
 *
 *   stored      lastSeenAt          →  effective
 *   "online"    < 90 s ago          →  "online"
 *   "online"    ≥ 90 s ago          →  "offline"   ← crash / hard-close
 *   "idle"      < 90 s ago          →  "idle"
 *   "idle"      ≥ 90 s ago          →  "offline"
 *   "dnd"       any                 →  "dnd"        ← manual; no expiry
 *   "offline"   any                 →  "offline"
 */
export function getEffectiveStatus(
  status: string,
  lastSeenAt: number
): "online" | "idle" | "dnd" | "offline" {
  // DND is a manual user choice — never expire it automatically
  if (status === "dnd")     return "dnd";
  if (status === "offline") return "offline";

  const stale = Date.now() - lastSeenAt > PRESENCE_EXPIRY_MS;
  if (stale) return "offline";

  if (status === "idle") return "idle";
  return "online";
}

// ─── Get presence for a single user ──────────────────────────────────────

/**
 * Returns the presence row for any given user, with the effective status
 * already resolved (stale heartbeat → "offline").
 */
export const getPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();
    if (!row) return null;
    return {
      ...row,
      status: getEffectiveStatus(row.status, row.lastSeenAt),
    };
  },
});

// ─── Batch get presence ───────────────────────────────────────────────────

/**
 * Returns effective presence for an array of user IDs in one round trip.
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
    const map: Record<string, { status: string; lastSeenAt: number } | null> = {};
    userIds.forEach((id: any, i: any) => {
      const row = rows[i];
      map[id] = row
        ? {
            status: getEffectiveStatus(row.status, row.lastSeenAt),
            lastSeenAt: row.lastSeenAt,
          }
        : null;
    });
    return map;
  },
});

// ─── Get own presence ─────────────────────────────────────────────────────

/**
 * Returns the authenticated user's own presence row with effective status.
 */
export const getMyPresence = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("presence")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();
    if (!row) return null;
    return {
      ...row,
      status: getEffectiveStatus(row.status, row.lastSeenAt),
    };
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
 * Returns IDs of users whose effective status is "online".
 *
 * We scan ALL presence rows (not just those with status="online") because a
 * crashed tab leaves status="online" permanently; getEffectiveStatus demotes
 * it to "offline" once the heartbeat has expired.
 */
export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("presence").collect();
    return rows
      .filter((r: any) => getEffectiveStatus(r.status, r.lastSeenAt) === "online")
      .map((r: any) => r.userId);
  },
});
