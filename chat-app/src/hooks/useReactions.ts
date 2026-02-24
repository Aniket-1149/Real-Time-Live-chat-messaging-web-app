"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ── Read hooks ─────────────────────────────────────────────────────────────

/**
 * Returns live grouped reactions for a single message.
 *
 * Each item: `{ emoji, count, userIds, selfReacted }`
 *
 * Reactively updates when any user toggles a reaction on this message.
 *
 * @param messageId – pass `null` to skip
 * @returns `undefined` while loading | `GroupedReaction[]`
 */
export function useReactions(messageId: Id<"messages"> | null) {
  return useQuery(
    api.reactions.getReactions,
    messageId ? { messageId } : "skip"
  );
}

/**
 * Returns live grouped reactions for multiple messages at once.
 *
 * Returns a map of `messageId → GroupedReaction[]`.
 * Use this in a full conversation view to avoid N individual subscriptions.
 *
 * @param messageIds – array of message IDs (skips when empty)
 * @returns `undefined` while loading | `Record<string, GroupedReaction[]>`
 */
export function useBatchReactions(messageIds: Id<"messages">[]) {
  return useQuery(
    api.reactions.batchGetReactions,
    messageIds.length > 0 ? { messageIds } : "skip"
  );
}

// ── Write hook ─────────────────────────────────────────────────────────────

/**
 * Returns the mutation to add or remove an emoji reaction on a message.
 * Calling it twice with the same emoji toggles the reaction off.
 *
 * @example
 *   const toggleReaction = useToggleReaction();
 *   await toggleReaction({ messageId, emoji: "👍" });
 */
export function useToggleReaction() {
  return useMutation(api.reactions.toggleReaction);
}
