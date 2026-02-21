"use client";

import { useQuery, useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/** Debounce delay for typing stop detection (ms) */
const TYPING_STOP_DELAY = 1500;

/**
 * Returns live list of users currently typing in a conversation
 * (excluding the authenticated caller).
 */
export function useTypingUsers(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.typing.getTypingUsers,
    conversationId ? { conversationId } : "skip"
  );
}

/**
 * Returns a `reportTyping` callback to call on every keystroke.
 * Automatically sends setTyping(false) when the user stops typing.
 *
 * Usage:
 *   const reportTyping = useTypingReporter(conversationId);
 *   <textarea onChange={() => reportTyping()} />
 */
export function useTypingReporter(conversationId: Id<"conversations"> | null) {
  const setTyping = useMutation(api.typing.setTyping);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTyping = useRef(false);

  // Clear typing indicator when conversation changes or component unmounts
  useEffect(() => {
    return () => {
      if (isCurrentlyTyping.current && conversationId) {
        setTyping({ conversationId, isTyping: false }).catch(() => {});
      }
    };
  }, [conversationId, setTyping]);

  const reportTyping = useCallback(() => {
    if (!conversationId) return;

    // Mark as typing if not already
    if (!isCurrentlyTyping.current) {
      isCurrentlyTyping.current = true;
      setTyping({ conversationId, isTyping: true }).catch(console.error);
    }

    // Reset stop timer
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isCurrentlyTyping.current = false;
      setTyping({ conversationId, isTyping: false }).catch(console.error);
    }, TYPING_STOP_DELAY);
  }, [conversationId, setTyping]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isCurrentlyTyping.current) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    isCurrentlyTyping.current = false;
    setTyping({ conversationId, isTyping: false }).catch(console.error);
  }, [conversationId, setTyping]);

  return { reportTyping, stopTyping };
}
