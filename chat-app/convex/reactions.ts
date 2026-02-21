import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";

// ─── Get reactions for a message ──────────────────────────────────────────

/**
 * Returns all reactions on a message, grouped by emoji.
 *
 * Returns an array of:
 *   { emoji, count, userIds, selfReacted }
 *
 * Consumers subscribe reactively — toggling any reaction triggers a re-render
 * only for the components subscribed to this specific messageId.
 */
export const getReactions = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await requireAuthUserId(ctx);

    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
      .collect();

    // Group by emoji
    const grouped: Record<
      string,
      { emoji: string; count: number; userIds: string[]; selfReacted: boolean }
    > = {};

    for (const row of rows as any[]) {
      if (!grouped[row.emoji]) {
        grouped[row.emoji] = {
          emoji: row.emoji,
          count: 0,
          userIds: [],
          selfReacted: false,
        };
      }
      grouped[row.emoji].count += 1;
      grouped[row.emoji].userIds.push(row.userId);
      if (row.userId === userId) grouped[row.emoji].selfReacted = true;
    }

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  },
});

// ─── Batch get reactions (for a list of messages) ────────────────────────

/**
 * Returns a map of messageId → grouped reactions for multiple messages.
 * Used to load reactions for a full conversation view in one query.
 */
export const batchGetReactions = query({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, { messageIds }) => {
    const userId = await requireAuthUserId(ctx);

    const allRows = await Promise.all(
      messageIds.map((mid: any) =>
        ctx.db
          .query("reactions")
          .withIndex("by_message", (q: any) => q.eq("messageId", mid))
          .collect()
      )
    );

    const result: Record<string, any[]> = {};
    messageIds.forEach((mid: any, i: any) => {
      const rows: any[] = allRows[i];
      const grouped: Record<string, any> = {};
      for (const row of rows) {
        if (!grouped[row.emoji]) {
          grouped[row.emoji] = { emoji: row.emoji, count: 0, userIds: [], selfReacted: false };
        }
        grouped[row.emoji].count += 1;
        grouped[row.emoji].userIds.push(row.userId);
        if (row.userId === userId) grouped[row.emoji].selfReacted = true;
      }
      result[mid] = Object.values(grouped).sort((a: any, b: any) => b.count - a.count);
    });

    return result;
  },
});

// ─── Toggle reaction ───────────────────────────────────────────────────────

/**
 * Adds or removes an emoji reaction on a message for the current user.
 *
 * • If the user has NOT reacted with this emoji → insert a reaction row.
 * • If the user HAS reacted with this emoji     → delete the reaction row.
 *
 * Because each reaction is its own row, toggling one user's reaction
 * only invalidates subscriptions keyed on that messageId, not the whole
 * message document.
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const userId = await requireAuthUserId(ctx);

    // Verify the message exists and isn't deleted
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");
    if (message.deleted) throw new Error("Cannot react to a deleted message");

    // Check for existing reaction row
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user_emoji", (q: any) =>
        q.eq("messageId", messageId).eq("userId", userId).eq("emoji", emoji)
      )
      .unique();

    if (existing) {
      // Remove the reaction
      await ctx.db.delete(existing._id);
    } else {
      // Add the reaction
      await ctx.db.insert("reactions", {
        messageId,
        userId,
        emoji,
        createdAt: Date.now(),
      });
    }
  },
});

// ─── Remove all reactions by a user (for account cleanup) ────────────────

/**
 * Deletes all reaction rows for the authenticated user.
 * Called when a user deletes their account.
 */
export const removeAllMyReactions = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    await Promise.all(rows.map((r: any) => ctx.db.delete(r._id)));
  },
});
