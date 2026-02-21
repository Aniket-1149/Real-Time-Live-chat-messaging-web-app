"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Returns a live list of messages for a given conversation.
 * Automatically re-renders when new messages arrive (Convex reactive query).
 */
export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip"
  );
}

/**
 * Returns the mutation to send a message into a conversation.
 *
 * Usage:
 *   const sendMessage = useSendMessage();
 *   await sendMessage({ conversationId, text });
 */
export function useSendMessage() {
  return useMutation(api.messages.sendMessage);
}

/**
 * Returns the mutation to toggle an emoji reaction on a message.
 */
export function useToggleReaction() {
  return useMutation(api.messages.toggleReaction);
}

/**
 * Returns the mutation to soft-delete a message.
 */
export function useDeleteMessage() {
  return useMutation(api.messages.deleteMessage);
}
