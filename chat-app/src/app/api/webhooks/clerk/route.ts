import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Clerk → Convex user sync webhook.
 *
 * Every time a user is created, updated, or deleted in Clerk this endpoint
 * mirrors those changes into the Convex `users` (and `presence`) tables.
 *
 * Fields synced
 * ─────────────
 *  clerkId      — data.id (Clerk stable ID)
 *  name         — first_name + last_name, fallback to username, then "User"
 *  displayName  — username (shown in UI when distinct from name)
 *  email        — primary_email_address
 *  imageUrl     — profile_image_url / image_url, DiceBear fallback
 *  lastSeenAt   — seeded from created_at on first sync
 *
 * Clerk dashboard setup
 * ─────────────────────
 *  1. Dashboard → Webhooks → Add endpoint
 *  2. URL: https://<your-domain>/api/webhooks/clerk
 *  3. Events: user.created, user.updated, user.deleted
 *  4. Copy Signing Secret → CLERK_WEBHOOK_SECRET env var
 */

// Lazily created — avoids module-level instantiation errors during Next.js build
function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

/** Derive a deterministic DiceBear avatar URL as a fallback */
function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Extracts and normalises all relevant fields from a Clerk user object.
 * Works for both user.created and user.updated event payloads.
 */
function extractUserFields(data: WebhookEvent["data"] & { id: string }) {
  const clerkId = data.id;

  // Name — prefer first+last, fall back to username, then "User"
  const firstName = ("first_name" in data ? data.first_name : null) ?? "";
  const lastName  = ("last_name"  in data ? data.last_name  : null) ?? "";
  const username  = ("username"   in data ? data.username   : null) ?? null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = fullName || username || "User";

  // displayName — only set when the Clerk username is distinct from the
  // computed full name (avoids duplicating the same string twice)
  const displayName =
    username && username !== name ? username : undefined;

  // Primary email
  const emailAddresses =
    "email_addresses" in data ? (data.email_addresses ?? []) : [];
  const primaryEmailId =
    "primary_email_address_id" in data ? data.primary_email_address_id : null;
  const primaryEmail =
    emailAddresses.find((e: any) => e.id === primaryEmailId)
      ?.email_address ??
    emailAddresses[0]?.email_address ??
    "";

  // Avatar — Clerk provides image_url (newer) or profile_image_url (legacy)
  const rawImage: string | null =
    (("image_url"         in data && typeof data.image_url === "string")         ? data.image_url         : null) ??
    (("profile_image_url" in data && typeof data.profile_image_url === "string") ? data.profile_image_url : null);

  // Reject Clerk's built-in default avatars (they use gravatar/default paths)
  // and substitute our own DiceBear fallback so every user has a unique avatar.
  const isDefaultImage =
    !rawImage ||
    rawImage.includes("gravatar.com") ||
    rawImage.includes("/default_");

  const imageUrl = isDefaultImage ? dicebearUrl(clerkId) : rawImage;

  // Seed lastSeenAt from Clerk's account creation time
  const createdAt =
    "created_at" in data && typeof data.created_at === "number"
      ? data.created_at
      : undefined;

  return { clerkId, name, displayName, email: primaryEmail, imageUrl, createdAt };
}

export async function POST(req: Request) {
  // ── Guard: webhook secret must be configured ─────────────────────────────
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // ── Verify Svix signature ────────────────────────────────────────────────
  const headerPayload = await headers();
  const svixId        = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;
  console.log(`[clerk-webhook] Received event: ${type}`, { userId: "id" in data ? data.id : "?" });

  // ── Dispatch to Convex ───────────────────────────────────────────────────
  try {
    const convex = getConvexClient();

    if (type === "user.created" || type === "user.updated") {
      const fields = extractUserFields(data as any);

      console.log(`[clerk-webhook] Syncing user to Convex:`, {
        clerkId:     fields.clerkId,
        name:        fields.name,
        displayName: fields.displayName ?? "(none)",
        email:       fields.email,
        hasAvatar:   !String(fields.imageUrl).includes("dicebear"),
      });

      await convex.mutation(api.users.upsertUser, fields);

      console.log(`[clerk-webhook] ✓ User synced (${type}): ${fields.clerkId}`);
    }

    if (type === "user.deleted") {
      const clerkId = "id" in data ? data.id : undefined;
      if (!clerkId) {
        console.warn("[clerk-webhook] user.deleted event missing id — skipping");
        return new Response("Missing user id", { status: 400 });
      }

      console.log(`[clerk-webhook] Marking user offline: ${clerkId}`);
      await convex.mutation(api.users.deleteUser, { clerkId });
      console.log(`[clerk-webhook] ✓ User marked offline: ${clerkId}`);
    }
  } catch (err) {
    console.error(`[clerk-webhook] Failed to process ${type}:`, err);
    // Return 500 so Clerk retries the webhook
    return new Response("Internal error — Convex mutation failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

