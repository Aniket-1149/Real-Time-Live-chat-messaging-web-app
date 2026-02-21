"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Merges Clerk's `useUser()` with the Convex user + presence records.
 *
 * Returns:
 *  - `isLoading`  — true while either Clerk or Convex is still initialising
 *  - `isSignedIn` — true once Clerk confirms the session
 *  - `isSyncing`  — Clerk loaded + signed in, but Convex record not yet found
 *  - `user`       — merged object with profile + live presence status;
 *                   falls back to Clerk data while Convex sync is pending
 */
export function useAuthUser() {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();

  // These run as skip-able reactive queries
  const convexUser = useQuery(api.users.getCurrentUser);
  const myPresence = useQuery(api.presence.getMyPresence);

  const isLoading = !clerkLoaded || convexUser === undefined;
  // Clerk is loaded + signed in, but Convex hasn't written the record yet
  const isSyncing = clerkLoaded && isSignedIn && convexUser === null;

  const status = (myPresence?.status ?? "offline") as
    | "online"
    | "idle"
    | "dnd"
    | "offline";

  const user =
    convexUser !== null && convexUser !== undefined
      ? {
          id: convexUser._id as string,
          clerkId: convexUser.clerkId,
          name: convexUser.displayName ?? convexUser.name,
          email: convexUser.email,
          avatar: convexUser.imageUrl,
          status,
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

