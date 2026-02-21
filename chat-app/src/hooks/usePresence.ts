"use client";

import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Manages the current user's presence (online/idle/offline).
 *
 * - Sets status to "online" on mount.
 * - Sends a heartbeat every 30 s to keep the session alive.
 * - Sets status to "offline" on page unload / component unmount.
 *
 * Mount this hook once in the root chat layout.
 */
export function usePresence() {
  const setPresence = useMutation(api.presence.setPresence);

  useEffect(() => {
    // Set online immediately
    setPresence({ status: "online" }).catch(console.error);

    // Heartbeat every 30 s
    const heartbeat = setInterval(() => {
      setPresence({ status: "online" }).catch(console.error);
    }, 30_000);

    // Page visibility: go idle when hidden
    const handleVisibility = () => {
      if (document.hidden) {
        setPresence({ status: "idle" }).catch(console.error);
      } else {
        setPresence({ status: "online" }).catch(console.error);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Set offline on unload
    const handleUnload = () => {
      setPresence({ status: "offline" }).catch(console.error);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      setPresence({ status: "offline" }).catch(console.error);
    };
  }, [setPresence]);
}
