"use client";

import { useQuery, useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
// Re-export so callers can get the type from the hook without a separate import
export type { UITypingUser } from "@/types/ui";

// ── Constants ──────────────────────────────────────────────────────────────
// TYPING_STOP_DELAY must be < TYPING_TTL_MS (3 000 ms) so the hook clears
// the DB row before the backend would expire it on its own.
const TYPING_STOP_DELAY  = 2_000; // ms of inactivity → send setTyping(false)
const TYPING_HEARTBEAT   = 2_000; // ms between re-sends while still typing

// ── Read hook ──────────────────────────────────────────────────────────────

/**
 * Returns a live list of users currently typing in a conversation,
 * excluding the authenticated caller.
 *
 * Each item: `{ userId: string, name: string }`
 *
 * Pass this array directly to `<TypingIndicator typingUsers={...} />`.
 *
 * @param conversationId – pass `null` to skip
 * @returns `undefined` while loading | `{ userId, name }[]`
 */
export function useTypingUsers(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.typing.getTypingUsers,
    conversationId ? { conversationId } : "skip"
  );
}

// ── Write hook ─────────────────────────────────────────────────────────────

/**
 * Returns `reportTyping` (call on every keystroke) and `stopTyping`
 * (call on send / blur / unmount).
 *
 * Mutation strategy — avoids a round-trip on every keystroke:
 *
 *  1. First keystroke of a new burst  → setTyping(true)  immediately
 *  2. Subsequent keystrokes           → do nothing (DB row is already fresh)
 *  3. Every TYPING_HEARTBEAT ms       → setTyping(true) to refresh updatedAt
 *     while the user is still typing  (keeps the row alive across slow typing)
 *  4. TYPING_STOP_DELAY ms no keys    → setTyping(false) + clear heartbeat
 *  5. stopTyping() called explicitly  → setTyping(false) immediately
 *
 * @param conversationId – pass `null` when no conversation is active
 * @returns `{ reportTyping: () => void, stopTyping: () => void }`
 */
export function useTypingReporter(conversationId: Id<"conversations"> | null) {
  const setTyping = useMutation(api.typing.setTyping);

  // Refs — never stale-close over mutation or timers
  const setTypingRef      = useRef(setTyping);
  const convIdRef         = useRef(conversationId);
  const isTypingRef       = useRef(false);
  const stopTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setTypingRef.current = setTyping; },          [setTyping]);
  useEffect(() => { convIdRef.current    = conversationId; },     [conversationId]);

  // ── helpers ────────────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current)      { clearTimeout(stopTimerRef.current);      stopTimerRef.current      = null; }
    if (heartbeatTimerRef.current) { clearInterval(heartbeatTimerRef.current); heartbeatTimerRef.current = null; }
  }, []);

  const sendStop = useCallback(() => {
    clearTimers();
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    const id = convIdRef.current;
    if (id) setTypingRef.current({ conversationId: id, isTyping: false }).catch(() => {});
  }, [clearTimers]);

  // ── cleanup on conversation change or unmount ──────────────────────────

  useEffect(() => {
    return () => { sendStop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── public API ─────────────────────────────────────────────────────────

  const reportTyping = useCallback(() => {
    const id = convIdRef.current;
    if (!id) return;

    // First keystroke of a new burst — send immediately
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingRef.current({ conversationId: id, isTyping: true }).catch(console.error);

      // Heartbeat: re-send while typing to keep updatedAt fresh
      heartbeatTimerRef.current = setInterval(() => {
        if (isTypingRef.current && convIdRef.current) {
          setTypingRef.current({ conversationId: convIdRef.current, isTyping: true }).catch(() => {});
        }
      }, TYPING_HEARTBEAT);
    }

    // Restart the stop timer on every keystroke
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(sendStop, TYPING_STOP_DELAY);
  }, [sendStop]);

  const stopTyping = useCallback(() => { sendStop(); }, [sendStop]);

  return { reportTyping, stopTyping };
}
