import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Returns the current authenticated user's Convex record.
 * Returns `undefined` while loading, `null` if not found.
 */
export function useCurrentUser() {
  return useQuery(api.users.getCurrentUser);
}
