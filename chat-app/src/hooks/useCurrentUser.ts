/**
 * @deprecated Use `useAuthUser()` from `@/hooks/useAuthUser` instead.
 *
 * `useAuthUser()` returns the same Convex user record AND merges it with
 * Clerk data, presence status, and loading states — so there is no reason
 * to subscribe to the raw Convex record separately.
 *
 * This file is kept only so any external imports don't break.
 * It will be removed in a future clean-up pass.
 */

export { useAuthUser as useCurrentUser } from "@/hooks/useAuthUser";
