"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Returns live grouped reactions for a single message.
 *
 * Returns an array of:
 *   { emoji, count, userIds, selfReacted }
 *
 * Reactively updates when any user toggles a reaction on this message.
 */
export function useReactions(messageId: Id<"messages"> | null) {
  return useQuery(
    api.reactions.getReactions,
    messageId ? { messageId } : "skip"
  );
}

/**
 * Returns live grouped reactions for multiple messages at once.
 * Returns a map of messageId → grouped reactions.
 * Useful for loading a full conversation view in a single subscription.
 */
export function useBatchReactions(messageIds: Id<"messages">[]) {
  return useQuery(
    api.reactions.batchGetReactions,
    messageIds.length > 0 ? { messageIds } : "skip"
  );
}

/**
 * Returns the mutation to add or remove an emoji reaction on a message.
 *
 * Usage:
 *   const toggleReaction = useToggleReaction();
 *   await toggleReaction({ messageId, emoji: "👍" });
 */
export function useToggleReaction() {
  return useMutation(api.reactions.toggleReaction);
}
