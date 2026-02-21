import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";

/** Stale threshold: typing indicators older than 5 s are ignored on read */
const TYPING_TTL_MS = 5_000;

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

