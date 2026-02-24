import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";

/**
 * A typing indicator is considered stale after this window.
 * Exported so the client hook can use the exact same value.
 *
 * Rule: TYPING_STOP_DELAY (hook) < TYPING_TTL_MS (backend)
 * The hook must clear the indicator before the server would expire it,
 * preventing ghost "X is typing" labels after the user stops.
 *
 *   hook stop delay : 2 000 ms  (fires setTyping=false after 2 s no keys)
 *   backend TTL     : 3 000 ms  (filters stale rows at query time)
 */
export const TYPING_TTL_MS = 3_000;

/**
 * How often the hook re-sends setTyping(true) while the user is actively
 * typing — acts as a heartbeat so the backend row stays fresh.
 * Must be < TYPING_TTL_MS to prevent the row expiring mid-burst.
 */
export const TYPING_HEARTBEAT_MS = 2_000;

// ─── Get active typers in a conversation ──────────────────────────────────

/**
 * Returns the name + userId of every user currently typing in a conversation,
 * excluding the caller. Stale records (older than TYPING_TTL_MS) are filtered
 * out so there is no need for a cleanup job.
 *
 * This query subscribes to the `typing` table via the by_conversation index,
 * so any keystroke from any participant triggers a real-time push to all
 * subscribers of this conversation.
 */
export const getTypingUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireAuthUserId(ctx);
    const cutoff = Date.now() - TYPING_TTL_MS;

    const indicators = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .collect();

    const active = indicators.filter(
      (t: any) => t.userId !== userId && t.updatedAt > cutoff
    );

    const withNames = await Promise.all(
      active.map(async (t: any) => {
        const user = await ctx.db.get(t.userId);
        return { userId: t.userId, name: user?.name ?? "Someone" };
      })
    );

    return withNames;
  },
});

// ─── Set / clear typing indicator ─────────────────────────────────────────

/**
 * Upserts a typing indicator for the current user in a conversation.
 *
 * Call with isTyping=true on every keystroke (debounced in the hook).
 * Call with isTyping=false on send / blur / component unmount.
 */
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { conversationId, isTyping }) => {
    const userId = await requireAuthUserId(ctx);

    const existing = await ctx.db
      .query("typing")
      .withIndex("by_user_conversation", (q: any) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    if (isTyping) {
      if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: Date.now() });
      } else {
        await ctx.db.insert("typing", {
          conversationId,
          userId,
          updatedAt: Date.now(),
        });
      }
    } else {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

