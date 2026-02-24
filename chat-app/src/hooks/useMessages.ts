"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ── Read hooks ─────────────────────────────────────────────────────────────

/**
 * Returns a live list of messages for a given conversation, oldest-first.
 *
 * Soft-deleted messages are returned as tombstones:
 *   `{ deleted: true, text: null, …metadata preserved }`
 * so the UI can render "This message was deleted" in the correct position.
 *
 * @param conversationId – pass `null` to skip (no active conversation)
 * @returns `undefined` while loading | enriched AppMessage[]
 */
export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip"
  );
}

/**
 * Returns lightweight metadata for the active conversation.
 * Used by ChatWindow to drive smart auto-scroll without subscribing to
 * full message bodies.
 *
 * Shape: `{ latestMessageSentAt: number | null, unreadCount: number }`
 *
 *  `latestMessageSentAt` – sentAt of the newest message; changes whenever a
 *                          message arrives or is deleted. ChatWindow watches
 *                          this value to detect "new message arrived".
 *
 *  `unreadCount`         – messages with sentAt > user's lastReadAt.
 *                          Drives the "↓ N new" jump-button label.
 *
 * @param conversationId – pass `null` to skip
 * @returns `undefined` while loading | `{ latestMessageSentAt, unreadCount }`
 */
export function useConversationMeta(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.getConversationMeta,
    conversationId ? { conversationId } : "skip"
  );
}

// ── Write hooks ────────────────────────────────────────────────────────────

/**
 * Returns the mutation to send a message into a conversation.
 *
 * Supports optional `replyToId` for threaded replies.
 *
 * @example
 *   const sendMessage = useSendMessage();
 *   await sendMessage({ conversationId, text });
 *   await sendMessage({ conversationId, text, replyToId });
 */
export function useSendMessage() {
  return useMutation(api.messages.sendMessage);
}

/**
 * Returns the mutation to edit an existing message.
 * Only the original sender can edit; deleted messages cannot be edited.
 *
 * @example
 *   const editMessage = useEditMessage();
 *   await editMessage({ messageId, text: "corrected text" });
 */
export function useEditMessage() {
  return useMutation(api.messages.editMessage);
}

/**
 * Returns the mutation to soft-delete a message (sender-only).
 * The row is retained; listMessages returns a tombstone in its place.
 *
 * @example
 *   const deleteMessage = useDeleteMessage();
 *   await deleteMessage({ messageId });
 */
export function useDeleteMessage() {
  return useMutation(api.messages.deleteMessage);
}
