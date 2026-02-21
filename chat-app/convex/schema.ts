import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Production Convex schema for a realtime chat application.
 *
 * Design principles
 * ─────────────────
 * • Every table has indexes tuned for the exact queries the UI runs
 *   so Convex reactive subscriptions fan-out efficiently.
 * • Presence is split into its own table so heartbeat writes don't
 *   invalidate conversation/message subscriptions.
 * • Reactions live in their own table so toggling a reaction doesn't
 *   re-serialize the entire message document.
 * • Conversations carry a `type` discriminant ("dm" | "group") so
 *   group chat can be added without a migration.
 * • Messages are soft-deleted (deleted + deletedAt) — the row stays
 *   for reaction/reply integrity; the content is nulled client-side.
 * • conversationMembers stores unreadCount AND lastReadMessageId for
 *   accurate per-user read receipts.
 * • typing is a standalone ephemeral table with a composite unique
 *   index; stale rows are TTL-filtered on read (no scheduled job needed).
 *
 * Tables
 * ──────
 *  users               profile, synced from Clerk webhook
 *  presence            heartbeat / status (separate from profile)
 *  conversations       dm or group channel
 *  conversationMembers pivot: (userId ↔ conversationId) + unread state
 *  messages            chat messages with soft-delete
 *  reactions           per-emoji per-user reaction rows
 *  typing              ephemeral typing indicators (TTL via updatedAt)
 */
export default defineSchema({
  // ─── Users ────────────────────────────────────────────────────────────────
  // Profile data only — NO mutable status/heartbeat here so that writes
  // to presence never invalidate user-profile subscriptions.
  users: defineTable({
    /** Clerk user ID — maps auth identity to this row */
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    /** Profile picture URL (Clerk or DiceBear fallback) */
    imageUrl: v.string(),
    /** Display name override; null = use name */
    displayName: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .searchIndex("search_by_name", {
      searchField: "name",
      filterFields: ["clerkId"],
    }),

  // ─── Presence ────────────────────────────────────────────────────────────
  // One row per user. Written by the heartbeat hook every 30 s.
  // Queries that only need presence subscribe here and not to `users`.
  presence: defineTable({
    userId: v.id("users"),
    /** "online" | "idle" | "dnd" | "offline" */
    status: v.string(),
    /** Unix ms of last heartbeat — used by idle-detection logic */
    lastSeenAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ─── Conversations ────────────────────────────────────────────────────────
  conversations: defineTable({
    /**
     * "dm"    — exactly two participants, deduped by sorted participantIds
     * "group" — arbitrary number of participants, identified by name
     */
    type: v.union(v.literal("dm"), v.literal("group")),

    /**
     * DM: sorted [userId, userId] for dedup lookup.
     * Group: kept in sync with conversationMembers for convenience.
     */
    participantIds: v.array(v.id("users")),

    // Group-only fields
    /** Group display name (undefined for DMs) */
    name: v.optional(v.string()),
    /** Group avatar URL (undefined for DMs) */
    imageUrl: v.optional(v.string()),
    /** Creator of the group (undefined for DMs) */
    createdBy: v.optional(v.id("users")),

    // Snapshot of most recent message — avoids a sub-query in list view
    lastMessageId: v.optional(v.id("messages")),
    lastMessageText: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
    /** ID of the user who sent the last message (for "You: …" formatting) */
    lastMessageSenderId: v.optional(v.id("users")),
  })
    // DM dedup: exact match on sorted participantIds
    .index("by_participants", ["participantIds"])
    // Drive "conversations updated recently" list
    .index("by_last_message_time", ["lastMessageTime"]),

  // ─── Conversation Members ─────────────────────────────────────────────────
  // One row per (user × conversation). Holds all per-member mutable state
  // so that one user's unread count changing doesn't fan-out to others.
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),

    /** Number of messages received since the user last read this conversation */
    unreadCount: v.number(),
    /**
     * The _id of the last message the user has read.
     * Used for precise read-receipt rendering.
     */
    lastReadMessageId: v.optional(v.id("messages")),

    /**
     * Member role for group chats.
     * "member" (default) | "admin"
     */
    role: v.optional(v.union(v.literal("member"), v.literal("admin"))),

    /** When this member record was created (joined the conversation) */
    joinedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    // Primary lookup: "is user X a member of conversation Y?"
    .index("by_user_conversation", ["userId", "conversationId"]),

  // ─── Messages ─────────────────────────────────────────────────────────────
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),

    /** Message body — set to null on soft-delete */
    text: v.string(),

    /**
     * Optional reference to the message this one is replying to.
     * Enables threaded/quoted replies without a separate threads table.
     */
    replyToId: v.optional(v.id("messages")),

    // ── Soft delete ──────────────────────────────────────────────────────
    /** true once the sender has deleted this message */
    deleted: v.boolean(),
    /** Unix ms when the message was deleted (null if not deleted) */
    deletedAt: v.optional(v.number()),

    // ── Edit history ─────────────────────────────────────────────────────
    /** true if the message has been edited at least once */
    edited: v.optional(v.boolean()),
    /** Unix ms of last edit */
    editedAt: v.optional(v.number()),
  })
    // Primary subscription: load all messages in a conversation ordered asc
    .index("by_conversation", ["conversationId"])
    // Admin / moderation: find all messages by a user
    .index("by_sender", ["senderId"])
    // Reply chain: find all replies to a given message
    .index("by_reply_to", ["replyToId"]),

  // ─── Reactions ────────────────────────────────────────────────────────────
  // One row per (user × message × emoji).
  // Separating reactions from the message document means toggling a reaction
  // only invalidates the reactions subscription, not the message list.
  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    /** A single emoji character, e.g. "👍" */
    emoji: v.string(),
    createdAt: v.number(),
  })
    // Load all reactions for a message (group by emoji client-side)
    .index("by_message", ["messageId"])
    // Check / toggle: does user X have reaction Y on message Z?
    .index("by_message_user_emoji", ["messageId", "userId", "emoji"])
    // Remove all reactions when a message is hard-deleted
    .index("by_user", ["userId"]),

  // ─── Typing Indicators ───────────────────────────────────────────────────
  // Ephemeral one-row-per-(user × conversation).
  // No scheduled job needed — stale rows (> TYPING_TTL_MS) are filtered
  // during the query so Convex reactivity handles the rest.
  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    /** Unix ms of the last keystroke — used for TTL filtering */
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),
});
