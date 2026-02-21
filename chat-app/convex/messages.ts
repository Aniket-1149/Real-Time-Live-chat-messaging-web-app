import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";
import { Id } from "./_generated/dataModel";

// ─── List messages in a conversation ──────────────────────────────────────

/**
 * Returns all (non-deleted) messages for a conversation, oldest first.
 * Each message is enriched with the sender's name and imageUrl for rendering.
 */
export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    await requireAuthUserId(ctx);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) =>
        q.eq("conversationId", conversationId)
      )
      .order("asc")
      .collect();

    // Enrich with sender info
    const enriched = await Promise.all(
      messages
        .filter((m: any) => !m.deleted)
        .map(async (msg: any) => {
          const sender = await ctx.db.get(msg.senderId);
          return {
            ...msg,
            senderName: sender?.name ?? "Unknown",
            senderImageUrl: sender?.imageUrl ?? "",
          };
        })
    );

    return enriched;
  },
});

// ─── Send a message ────────────────────────────────────────────────────────

/**
 * Inserts a new message and updates the conversation's lastMessage fields
 * and the unread count for the other participant.
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  handler: async (ctx, { conversationId, text }) => {
    const userId = await requireAuthUserId(ctx);

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message text cannot be empty");

    // Insert the message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: userId,
      text: trimmed,
      reactions: [],
      deleted: false,
    });

    // Update the conversation snapshot
    await ctx.db.patch(conversationId, {
      lastMessageId: messageId,
      lastMessageText: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
      lastMessageTime: Date.now(),
    });

    // Increment unread count for every OTHER member
    const allMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
      .collect();

    await Promise.all(
      allMembers
        .filter((m: any) => m.userId !== userId)
        .map((m: any) => ctx.db.patch(m._id, { unreadCount: m.unreadCount + 1 }))
    );

    return messageId;
  },
});

// ─── Toggle reaction ───────────────────────────────────────────────────────

/**
 * Adds or removes an emoji reaction from a message for the current user.
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const userId = await requireAuthUserId(ctx);

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    const reactions: { emoji: string; userIds: Id<"users">[] }[] =
      message.reactions ?? [];

    const existing = reactions.find((r) => r.emoji === emoji);

    let updated: { emoji: string; userIds: Id<"users">[] }[];

    if (existing) {
      const hasReacted = existing.userIds.includes(userId);
      updated = reactions
        .map((r) => {
          if (r.emoji !== emoji) return r;
          return {
            emoji,
            userIds: hasReacted
              ? r.userIds.filter((id) => id !== userId)
              : [...r.userIds, userId],
          };
        })
        .filter((r) => r.userIds.length > 0);
    } else {
      updated = [...reactions, { emoji, userIds: [userId] }];
    }

    await ctx.db.patch(messageId, { reactions: updated });
  },
});

// ─── Delete (soft) a message ───────────────────────────────────────────────

/**
 * Marks a message as deleted. Only the original sender can delete.
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await requireAuthUserId(ctx);

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(messageId, { deleted: true });
  },
});
