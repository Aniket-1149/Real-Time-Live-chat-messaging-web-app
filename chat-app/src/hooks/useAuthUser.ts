"use client";

import { useUser } from "@clerk/nextjs";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Merges Clerk's `useUser()` with the Convex user record.
 *
 * Returns:
 *  - `isLoading`  — true while either Clerk or Convex is still initialising
 *  - `isSignedIn` — true once Clerk confirms the session
 *  - `isSyncing`  — Clerk loaded + signed in, but Convex record not yet found
 *  - `user`       — merged object; avatar/name fall back to Clerk data if
 *                   the Convex record hasn't arrived yet
 */
export function useAuthUser() {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const convexUser = useCurrentUser();

  const isLoading = !clerkLoaded || convexUser === undefined;
  // Clerk is loaded + signed in, but Convex hasn't written the record yet
  const isSyncing = clerkLoaded && isSignedIn && convexUser === null;

  const user =
    convexUser !== null && convexUser !== undefined
      ? {
          id: convexUser._id as string,
          clerkId: convexUser.clerkId,
          name: convexUser.name,
          email: convexUser.email,
          avatar: convexUser.imageUrl,
          status: convexUser.status as "online" | "idle" | "dnd" | "offline",
        }
      : clerkUser
      ? {
          id: clerkUser.id,
          clerkId: clerkUser.id,
          name: clerkUser.fullName ?? clerkUser.username ?? "Unknown",
          email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          avatar:
            clerkUser.imageUrl ??
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${clerkUser.id}`,
          status: "online" as const,
        }
      : null;

  return { isLoading, isSignedIn: isSignedIn ?? false, isSyncing, user };
}
