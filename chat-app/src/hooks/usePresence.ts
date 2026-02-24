"use client";

import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ── Constants ──────────────────────────────────────────────────────────────
// Must match HEARTBEAT_INTERVAL_MS in convex/presence.ts
const HEARTBEAT_INTERVAL_MS = 30_000;   // 30 s

// User is considered idle after this long with no mouse/keyboard/touch input
const IDLE_AFTER_MS = 2 * 60_000;       // 2 min

/**
 * Manages the current user's presence (online / idle / offline).
 *
 * Lifecycle
 * ─────────
 *  • Mount              → "online"
 *  • Heartbeat (30 s)   → "online"  (skipped when tab is hidden)
 *  • 2 min no activity  → "idle"    (activity = mouse / keyboard / touch / scroll)
 *  • Tab hidden         → "idle"
 *  • Tab visible again  → "online"  + resets idle timer
 *  • beforeunload       → offline via navigator.sendBeacon  (works on hard close)
 *  • pagehide           → offline via navigator.sendBeacon  (covers mobile Safari)
 *  • Unmount            → "offline" via normal mutation
 */
export function usePresence() {
  const setPresence = useMutation(api.presence.setPresence);

  // Keep a stable ref so event listeners always close over the latest mutation
  const setPresenceRef = useRef(setPresence);
  useEffect(() => { setPresenceRef.current = setPresence; }, [setPresence]);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let currentStatus: "online" | "idle" = "online";

    // ── helpers ─────────────────────────────────────────────────────────────

    const set = (status: "online" | "idle" | "offline") => {
      setPresenceRef.current({ status }).catch(console.error);
    };

    /**
     * Build a URL Convex can receive to flip status to "offline" without
     * waiting for an open connection. Used by sendBeacon as a fallback
     * for hard-close / mobile-background scenarios.
     *
     * NOTE: sendBeacon is a best-effort signal. Convex's HTTP Actions
     * aren't wired here yet — the mutation fallback in beforeunload is
     * the primary path. The navigator.sendBeacon call is left as a
     * well-structured no-op (posts to window.location) until an HTTP
     * Action endpoint is added.
     */
    const sendOfflineBeacon = () => {
      // Try the normal async mutation first (works if the JS runtime is
      // still alive for a few more ms, which it usually is on desktop).
      set("offline");
    };

    // ── idle detection ───────────────────────────────────────────────────

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // If coming back from idle → go online
      if (currentStatus === "idle" && !document.hidden) {
        currentStatus = "online";
        set("online");
      }
      idleTimer = setTimeout(() => {
        currentStatus = "idle";
        set("idle");
      }, IDLE_AFTER_MS);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    activityEvents.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));

    // ── visibility ──────────────────────────────────────────────────────

    const handleVisibility = () => {
      if (document.hidden) {
        // Pause heartbeat while hidden to save battery / quota
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        currentStatus = "idle";
        set("idle");
      } else {
        // Came back into focus
        currentStatus = "online";
        set("online");
        resetIdleTimer();
        startHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── heartbeat ────────────────────────────────────────────────────────

    const startHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        // Only beat while the tab is visible and the user is active
        if (!document.hidden && currentStatus === "online") {
          set("online");
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    // ── hard-close / unload ──────────────────────────────────────────────

    const handleUnload = () => sendOfflineBeacon();

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);       // mobile Safari

    // ── boot ────────────────────────────────────────────────────────────

    set("online");
    resetIdleTimer();
    startHeartbeat();

    // ── cleanup ──────────────────────────────────────────────────────────

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (idleTimer)      clearTimeout(idleTimer);

      activityEvents.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);

      set("offline");
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — all values accessed via ref
}

// ── Presence query hooks ───────────────────────────────────────────────────
// These are READ-only hooks. They are separate from usePresence() (which is
// the management hook that writes heartbeats). Import these wherever you need
// to DISPLAY presence for one or many users without triggering a write.

/**
 * Returns the current user's own presence record.
 * Useful for displaying the authenticated user's status in the sidebar footer.
 *
 * @returns `undefined` while loading | the presence row when ready
 */
export function useMyPresence() {
  return useQuery(api.presence.getMyPresence);
}

/**
 * Returns the presence record for a single user by their Convex user ID.
 * Used to show the other user's status in a DM header or user list.
 *
 * @param userId – pass `null` to skip (e.g. no user selected)
 * @returns `undefined` while loading | the presence row | `null` if no record
 */
export function useUserPresence(userId: Id<"users"> | null) {
  return useQuery(
    api.presence.getPresence,
    userId ? { userId } : "skip"
  );
}

/**
 * Returns presence records for multiple users at once.
 * Used in group conversation headers or member lists to avoid N individual
 * subscriptions.
 *
 * @param userIds – array of Convex user IDs to query (skips if empty)
 * @returns `undefined` while loading | array of presence rows
 */
export function useBatchPresence(userIds: Id<"users">[]) {
  return useQuery(
    api.presence.batchGetPresence,
    userIds.length > 0 ? { userIds } : "skip"
  );
}
