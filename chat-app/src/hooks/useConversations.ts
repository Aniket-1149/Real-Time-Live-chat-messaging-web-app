"use client";

import { useQuery, useMutation } from "convex/react";
import { useCallback, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Returns a live list of conversations for the authenticated user.
 *
 * Each conversation includes:
 *  - Standard Convex fields (_id, _creationTime, participantIds, lastMessage*)
 *  - `otherUser`   – the other participant's profile
 *  - `unreadCount` – badge count for this user
 */
export function useConversations() {
  return useQuery(api.conversations.listConversations);
}

/**
 * Returns the mutation to get-or-create a DM with a given user.
 * Returns the conversation ID on success.
 */
export function useGetOrCreateConversation() {
  return useMutation(api.conversations.getOrCreateConversation);
}

/**
 * Marks a conversation as read (resets unread badge) when the
 * conversation is opened. Fires once on mount and whenever the ID changes.
 */
export function useMarkConversationRead(conversationId: Id<"conversations"> | null) {
  const markRead = useMutation(api.conversations.markConversationRead);

  useEffect(() => {
    if (!conversationId) return;
    markRead({ conversationId }).catch(console.error);
  }, [conversationId, markRead]);
}
