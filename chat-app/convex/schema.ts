import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for the realtime chat application.
 *
 * Tables:
 *  - users            : synced from Clerk via webhook; stores profile + presence
 *  - conversations    : direct-message channel between exactly two users
 *  - conversationMembers : pivot table (userId ↔ conversationId) with unreadCount
 *  - messages         : individual chat messages with optional reactions
 *  - typingIndicators : ephemeral record; TTL-managed via updatedAt field
 */
export default defineSchema({
  // ─── Users ───────────────────────────────────────────────────────────────
  users: defineTable({
    /** Clerk user ID – used to look up via auth identity */
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    /** URL to profile picture (Clerk or DiceBear fallback) */
    imageUrl: v.string(),
    /** "online" | "idle" | "dnd" | "offline" */
    status: v.string(),
    /** ISO timestamp of last heartbeat ping (for presence management) */
    lastSeenAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_status", ["status"]),

  // ─── Conversations ────────────────────────────────────────────────────────
  conversations: defineTable({
    /** The two participant Convex user IDs (always sorted for dedup) */
    participantIds: v.array(v.id("users")),
    lastMessageId: v.optional(v.id("messages")),
    lastMessageText: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
  }).index("by_participants", ["participantIds"]),

  // ─── Conversation membership + per-user unread count ─────────────────────
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    unreadCount: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  // ─── Messages ─────────────────────────────────────────────────────────────
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    text: v.string(),
    /** Array of { emoji, userIds[] } */
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userIds: v.array(v.id("users")),
        })
      )
    ),
    /** Soft-delete: hidden from queries but kept for audit */
    deleted: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

  // ─── Typing Indicators ────────────────────────────────────────────────────
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    /** Unix ms – stale entries older than 5 s are filtered on read */
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),
});
