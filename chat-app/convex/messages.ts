import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";

// ─── List messages in a conversation ──────────────────────────────────────

/**
 * Returns all non-deleted messages for a conversation, oldest-first.
 * Soft-deleted messages are replaced with a tombstone so UI can render
 * "This message was deleted" in the correct position in the thread.
 *
 * Each message is enriched with:
 *   senderName, senderImageUrl — for rendering the avatar/name
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

    const enriched = await Promise.all(
      messages.map(async (msg: any) => {
        // Always fetch sender so deleted-tombstones still show sender info
        const sender = await ctx.db.get(msg.senderId);

        // sentAt is the explicit send time; fall back to _creationTime for
        // any rows written before this field was added.
        const sentAt: number = msg.sentAt ?? msg._creationTime;

        if (msg.deleted) {
          // Return a tombstone — content scrubbed, metadata preserved
          return {
            _id: msg._id,
            _creationTime: msg._creationTime,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            senderName: sender?.displayName ?? sender?.name ?? "Unknown",
            senderImageUrl: sender?.imageUrl ?? "",
            text: null,
            sentAt,
            deleted: true,
            deletedAt: msg.deletedAt ?? null,
            edited: false,
            editedAt: null,
            replyToId: msg.replyToId ?? null,
          };
        }

        return {
          _id: msg._id,
          _creationTime: msg._creationTime,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderName: sender?.displayName ?? sender?.name ?? "Unknown",
          senderImageUrl: sender?.imageUrl ?? "",
          text: msg.text,
          sentAt,
          deleted: false,
          deletedAt: null,
          edited: msg.edited ?? false,
          editedAt: msg.editedAt ?? null,
          replyToId: msg.replyToId ?? null,
        };
      })
    );

    return enriched;
  },
});

// ─── Send a message ────────────────────────────────────────────────────────

/**
 * Inserts a new message then updates:
 *   • the conversation snapshot (lastMessageId, lastMessageText, lastMessageTime,
 *     lastMessageSenderId)
 *   • the unread counter for every member who is NOT the sender
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { conversationId, text, replyToId }) => {
    const userId = await requireAuthUserId(ctx);

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message text cannot be empty");

    // Verify sender is a member of the conversation
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user_conversation", (q: any) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();
    if (!membership) throw new Error("Not a member of this conversation");

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: userId,
      text: trimmed,
      sentAt: Date.now(),
      ...(replyToId ? { replyToId } : {}),
      deleted: false,
      edited: false,
    });

    // Update the conversation snapshot
    await ctx.db.patch(conversationId, {
      lastMessageId: messageId,
      lastMessageText: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
      lastMessageTime: Date.now(),
      lastMessageSenderId: userId,
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

// ─── Edit a message ────────────────────────────────────────────────────────

/**
 * Updates the text of a message. Only the original sender may edit.
 * Sets edited=true and editedAt to the current timestamp.
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, { messageId, text }) => {
    const userId = await requireAuthUserId(ctx);

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Only the sender can edit this message");
    if (message.deleted) throw new Error("Cannot edit a deleted message");

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message text cannot be empty");

    await ctx.db.patch(messageId, {
      text: trimmed,
      edited: true,
      editedAt: Date.now(),
    });
  },
});

// ─── Delete (soft) a message ───────────────────────────────────────────────

/**
 * Soft-deletes a message. Only the original sender may delete.
 * The row is kept for reaction/reply chain integrity; the content
 * is replaced with a tombstone on read (see listMessages above).
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await requireAuthUserId(ctx);

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Only the sender can delete this message");

    await ctx.db.patch(messageId, {
      deleted: true,
      deletedAt: Date.now(),
    });

    // If this was the last message in the conversation, update the snapshot
    const conversation = await ctx.db.get(message.conversationId);
    if (conversation?.lastMessageId === messageId) {
      await ctx.db.patch(message.conversationId, {
        lastMessageText: "Message deleted",
      });
    }
  },
});

