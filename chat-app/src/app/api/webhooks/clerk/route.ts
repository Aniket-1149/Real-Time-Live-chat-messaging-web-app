import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Clerk → Convex user sync webhook.
 *
 * Listens for user.created, user.updated, and user.deleted events from Clerk
 * and mirrors the data into the Convex `users` table.
 *
 * Setup:
 *  1. In Clerk dashboard → Webhooks → Add endpoint
 *  2. URL: https://<your-domain>/api/webhooks/clerk
 *  3. Subscribe to: user.created, user.updated, user.deleted
 *  4. Copy the Signing Secret → CLERK_WEBHOOK_SECRET env var
 */

// Lazily created — avoids module-level instantiation errors during build
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const convex = getConvexClient();

  // ── Verify Svix signature ────────────────────────────────────────────────
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
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
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // ── Handle events ────────────────────────────────────────────────────────
  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const clerkId = data.id;
    const firstName = data.first_name ?? "";
    const lastName = data.last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ") || "User";
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const imageUrl =
      data.image_url ??
      `https://api.dicebear.com/9.x/avataaars/svg?seed=${clerkId}`;

    await convex.mutation(api.users.upsertUser, {
      clerkId,
      name,
      email,
      imageUrl,
    });
  }

  if (type === "user.deleted") {
    const clerkId = data.id;
    if (clerkId) {
      await convex.mutation(api.users.deleteUser, { clerkId });
    }
  }

  return new Response("OK", { status: 200 });
}
