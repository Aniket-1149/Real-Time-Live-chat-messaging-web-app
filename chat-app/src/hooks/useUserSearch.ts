"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Search for users by name or email.
 * Debounce the query string on the calling side.
 *
 * Returns `undefined` while loading, `[]` for no results.
 */
export function useUserSearch(query: string) {
  return useQuery(api.users.searchUsers, { query });
}
