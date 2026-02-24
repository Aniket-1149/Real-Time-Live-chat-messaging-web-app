"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Returns a live list of messages for a given conversation.
 * Soft-deleted messages are returned as tombstones (text: null, deleted: true).
 * Automatically re-renders when new messages arrive.
 */
export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip"
  );
}

/**
 * Returns lightweight metadata for the active conversation, polled live.
 * Used by ChatWindow to drive smart auto-scroll without fetching message bodies.
 *
 *  latestMessageSentAt  – sentAt of the newest message (or null if empty).
 *                         Watching this value change tells the window a new
 *                         message has arrived.
 *
 *  unreadCount          – messages with sentAt > lastReadAt.
 *                         Drives the "↓ N new" jump-button label.
 */
export function useConversationMeta(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.getConversationMeta,
    conversationId ? { conversationId } : "skip"
  );
}

/**
 * Returns the mutation to send a message into a conversation.
 * Supports optional replyToId for threaded replies.
 *
 * Usage:
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
 */
export function useEditMessage() {
  return useMutation(api.messages.editMessage);
}

/**
 * Returns the mutation to soft-delete a message (sender-only).
 */
export function useDeleteMessage() {
  return useMutation(api.messages.deleteMessage);
}
