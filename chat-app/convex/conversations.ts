import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";
import { Id } from "./_generated/dataModel";

// ─── List conversations for the current user ──────────────────────────────

/**
 * Returns all conversations the authenticated user is a member of,
 * enriched with the other participant's profile and the unread count.
 * Results are sorted newest-message-first.
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    // All memberships for this user
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const results = await Promise.all(
      memberships.map(async (m: any) => {
        const conversation = await ctx.db.get(m.conversationId);
        if (!conversation) return null;

        // Find the other participant
        const otherUserId = conversation.participantIds.find(
          (id: Id<"users">) => id !== userId
        );
        if (!otherUserId) return null;

        const otherUser = await ctx.db.get(otherUserId);
        if (!otherUser) return null;

        return {
          ...conversation,
          otherUser,
          unreadCount: m.unreadCount,
        };
      })
    );

    return results
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b!.lastMessageTime ?? 0) - (a!.lastMessageTime ?? 0)
      );
  },
});

// ─── Get or create a direct conversation ─────────────────────────────────

/**
 * Finds an existing DM conversation between the caller and `otherUserId`,
 * or creates one if it doesn't exist. Returns the conversation ID.
 */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, { otherUserId }) => {
    const userId = await requireAuthUserId(ctx);
    if (userId === otherUserId) throw new Error("Cannot chat with yourself");

    // Sort IDs so participantIds is always deterministic
    const participantIds = [userId, otherUserId].sort() as Id<"users">[];

    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q: any) =>
        q.eq("participantIds", participantIds)
      )
      .unique();

    if (existing) return existing._id;

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds,
      lastMessageText: undefined,
      lastMessageTime: undefined,
    });

    // Create membership rows for both participants
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId,
      unreadCount: 0,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: otherUserId,
      unreadCount: 0,
    });

    return conversationId;
  },
});

// ─── Mark conversation as read ────────────────────────────────────────────

/**
 * Resets the unread counter for the authenticated user in a conversation.
 */
export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireAuthUserId(ctx);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user_conversation", (q: any) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    if (membership) {
      await ctx.db.patch(membership._id, { unreadCount: 0 });
    }
  },
});
