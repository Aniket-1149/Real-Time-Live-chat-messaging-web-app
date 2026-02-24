"use client";

import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ── Read hooks ─────────────────────────────────────────────────────────────

/**
 * Returns a live list of conversations for the authenticated user.
 *
 * Each item is an enriched AppConversation containing:
 *  - `unreadCount`  – timestamp-derived badge count (sentAt > lastReadAt)
 *  - `otherUser`    – presence-enriched profile (DM only)
 *  - `memberCount`  – total members (DM = 2, group = N)
 *  - `name`/`imageUrl` – group metadata (group only)
 *
 * Extensible: groups and DMs share the same return type. The `type`
 * discriminant ("dm" | "group") is used by adapters to branch rendering.
 *
 * @returns `undefined` while loading | `null` on auth error | array when ready
 */
export function useConversations() {
  return useQuery(api.conversations.listConversations);
}

// ── Write hooks ────────────────────────────────────────────────────────────

/**
 * Returns the mutation to get-or-create a DM conversation with another user.
 * The backend deduplicates by sorted participantIds — calling this twice with
 * the same user returns the same conversation ID.
 *
 * @returns Convex mutation function `({ otherUserId }) => Promise<Id<"conversations">>`
 */
export function useGetOrCreateConversation() {
  return useMutation(api.conversations.getOrCreateConversation);
}

/**
 * Returns the mutation to create a new group conversation.
 *
 * Args passed to the returned mutation:
 *  - `name`      – required display name
 *  - `memberIds` – at least one other user (creator is added automatically)
 *  - `imageUrl`  – optional group avatar URL
 *
 * The caller is automatically set as admin. Membership is tracked in the
 * conversationMembers table — extensible to roles, permissions, etc.
 *
 * @returns Convex mutation function `({ name, memberIds, imageUrl? }) => Promise<Id<"conversations">>`
 */
export function useCreateGroup() {
  return useMutation(api.conversations.createGroup);
}

/**
 * Marks a conversation as read (sets lastReadAt = now, resets unreadCount).
 * Fires automatically on mount and whenever `conversationId` changes —
 * i.e. whenever the user opens a conversation.
 *
 * @param conversationId – pass `null` to disable (e.g. no active conversation)
 */
export function useMarkConversationRead(
  conversationId: Id<"conversations"> | null
): void {
  const markRead = useMutation(api.conversations.markConversationRead);

  useEffect(() => {
    if (!conversationId) return;
    markRead({ conversationId }).catch(console.error);
  }, [conversationId, markRead]);
}
