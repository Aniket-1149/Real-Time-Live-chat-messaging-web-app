"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

/** Milliseconds to wait after the last keystroke before firing the query */
const DEBOUNCE_MS = 300;

/**
 * Searches for users by name / displayName / email, excluding the caller.
 *
 * Behaviour:
 *  - An empty `query` returns ALL other users (useful for the initial list).
 *  - The query string is debounced so Convex only creates a new reactive
 *    subscription after the user pauses typing — not on every keystroke.
 *  - Each result includes `status` and `lastSeenAt` from the presence table.
 *
 * @param query – search string (empty string = all users)
 * @returns `undefined` while loading / between debounce ticks | AppUser[] on ready
 */
export function useUserSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery(api.users.searchUsers, { query: debouncedQuery });
}
