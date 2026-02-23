import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./helpers";
import { Id } from "./_generated/dataModel";
import { getEffectiveStatus } from "./presence";

// ─── List conversations for the current user ──────────────────────────────

/**
 * Returns all conversations the authenticated user is a member of,
 * enriched with context needed by the sidebar list:
 *
 *  DM    → otherUser profile + presence status
 *  Group → name, imageUrl, member count
 *
 * Sorted newest-last-message-first.
 */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const results = await Promise.all(
      memberships.map(async (m: any) => {
        const conversation = await ctx.db.get(m.conversationId);
        if (!conversation) return null;

        const memberCount = (
          await ctx.db
            .query("conversationMembers")
            .withIndex("by_conversation", (q: any) =>
              q.eq("conversationId", m.conversationId)
            )
            .collect()
        ).length;

        if (conversation.type === "dm") {
          // Find the other participant
          const otherUserId = conversation.participantIds.find(
            (id: Id<"users">) => id !== userId
          );
          if (!otherUserId) return null;

          const otherUser = await ctx.db.get(otherUserId);
          if (!otherUser) return null;

          // Fetch presence separately so profile reads don't fan out on heartbeats
          const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q: any) => q.eq("userId", otherUserId))
            .unique();

          return {
            ...conversation,
            type: "dm" as const,
            otherUser: {
              ...otherUser,
              status: getEffectiveStatus(
                presence?.status ?? "offline",
                presence?.lastSeenAt ?? 0
              ),
              lastSeenAt: presence?.lastSeenAt ?? 0,
            },
            unreadCount: m.unreadCount,
            lastReadMessageId: m.lastReadMessageId ?? null,
            memberCount,
          };
        } else {
          // Group conversation
          return {
            ...conversation,
            type: "group" as const,
            unreadCount: m.unreadCount,
            lastReadMessageId: m.lastReadMessageId ?? null,
            memberCount,
          };
        }
      })
    );

    return results
      .filter(Boolean)
      .sort((a, b) => (b!.lastMessageTime ?? 0) - (a!.lastMessageTime ?? 0));
  },
});

// ─── Get or create a DM conversation ─────────────────────────────────────

/**
 * Finds an existing DM conversation between the caller and `otherUserId`,
 * or creates one. Returns the conversation ID.
 *
 * Deduplication strategy (two-phase, belt-and-suspenders):
 *
 *  Phase 1 — Index lookup
 *    participantIds is stored sorted, so we query the `by_participants`
 *    index with the same sorted pair for an O(1) hit.
 *
 *  Phase 2 — Full scan fallback
 *    In case the index hasn't caught up (e.g. warm-up, migration) we
 *    scan all DMs where both users appear and pick the first match.
 *    This path is O(n) but only runs when phase 1 returns nothing.
 *
 * Because both phases run inside the same mutation transaction, only
 * one writer can reach the `insert` path at a time — Convex serialises
 * concurrent writes to the same table, preventing race-condition dupes.
 */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, { otherUserId }) => {
    const userId = await requireAuthUserId(ctx);
    if (userId === otherUserId) throw new Error("Cannot start a conversation with yourself");

    // Canonical sorted pair — guarantees the same order regardless of
    // who initiates the conversation.
    const participantIds = [userId, otherUserId].sort() as Id<"users">[];

    // ── Phase 1: index lookup ─────────────────────────────────────────────
    const byIndex = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q: any) => q.eq("participantIds", participantIds))
      .unique();

    if (byIndex) return byIndex._id;

    // ── Phase 2: full-scan fallback ───────────────────────────────────────
    // Collect every DM, then check whether participantIds contains both
    // users.  We only reach this branch if the index returned nothing.
    const allDms = await ctx.db
      .query("conversations")
      .filter((q: any) => q.eq(q.field("type"), "dm"))
      .collect();

    const existing = allDms.find((c: any) => {
      const ids: string[] = c.participantIds ?? [];
      return (
        ids.length === 2 &&
        ids.includes(userId as string) &&
        ids.includes(otherUserId as string)
      );
    });

    if (existing) return existing._id;

    // ── Create ────────────────────────────────────────────────────────────
    const conversationId = await ctx.db.insert("conversations", {
      type: "dm",
      participantIds,
    });

    const now = Date.now();

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId,
      unreadCount: 0,
      joinedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: otherUserId,
      unreadCount: 0,
      joinedAt: now,
    });

    return conversationId;
  },
});

// ─── Create a group conversation ─────────────────────────────────────────

/**
 * Creates a new group conversation with the caller as admin.
 * `memberIds` must include at least one other user (not the caller).
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, memberIds, imageUrl }) => {
    const userId = await requireAuthUserId(ctx);

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Group name is required");

    // Deduplicate and always include the creator
    const allMemberIds = Array.from(new Set([userId, ...memberIds])) as Id<"users">[];
    if (allMemberIds.length < 2) throw new Error("A group must have at least 2 members");

    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      name: trimmedName,
      imageUrl,
      createdBy: userId,
      participantIds: allMemberIds,
    });

    const now = Date.now();

    await Promise.all(
      allMemberIds.map((memberId) =>
        ctx.db.insert("conversationMembers", {
          conversationId,
          userId: memberId,
          unreadCount: 0,
          role: memberId === userId ? "admin" : "member",
          joinedAt: now,
        })
      )
    );

    return conversationId;
  },
});

// ─── Mark conversation as read ────────────────────────────────────────────

/**
 * Resets the unread counter and records the lastReadMessageId
 * for the authenticated user in a conversation.
 */
export const markConversationRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastReadMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { conversationId, lastReadMessageId }) => {
    const userId = await requireAuthUserId(ctx);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user_conversation", (q: any) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    if (membership) {
      const patch: Record<string, any> = { unreadCount: 0 };
      if (lastReadMessageId !== undefined) patch.lastReadMessageId = lastReadMessageId;
      await ctx.db.patch(membership._id, patch);
    }
  },
});

// ─── Leave a group conversation ───────────────────────────────────────────

/**
 * Removes the authenticated user from a group conversation.
 * The last admin leaving will promote the next member to admin automatically.
 * DM conversations cannot be "left" — archive on the client side instead.
 */
export const leaveConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireAuthUserId(ctx);

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.type !== "group") throw new Error("Can only leave group conversations");

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user_conversation", (q: any) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .unique();

    if (!membership) throw new Error("Not a member of this conversation");

    await ctx.db.delete(membership._id);

    // Remove from participantIds snapshot
    const remaining = conversation.participantIds.filter(
      (id: Id<"users">) => id !== userId
    );
    await ctx.db.patch(conversationId, { participantIds: remaining });

    // If the leaving user was admin, promote the oldest remaining member
    if (membership.role === "admin" && remaining.length > 0) {
      const nextMembership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
        .first();
      if (nextMembership) {
        await ctx.db.patch(nextMembership._id, { role: "admin" });
      }
    }
  },
});

