# Chat App — Production Backend & Integration Layer

A **realtime chat web app** built with **Next.js 15 App Router**, **Convex** (realtime database + backend), and **Clerk** (authentication). All existing UI components from the Lovable-generated frontend are reused as-is; only the data layer is replaced.

---

## Architecture Overview

```
chat-app/
├── convex/                  ← Convex backend (runs in the cloud)
│   ├── schema.ts            ← Database schema (users, conversations, messages, typing)
│   ├── auth.config.ts       ← Clerk JWT verification config for Convex
│   ├── helpers.ts           ← getAuthUserId / requireAuthUserId utilities
│   ├── users.ts             ← User queries + mutations (upsert, presence, search)
│   ├── conversations.ts     ← Conversation queries + mutations (list, create, markRead)
│   ├── messages.ts          ← Message queries + mutations (list, send, react, delete)
│   └── typing.ts            ← Typing indicator queries + mutations
│
├── src/
│   ├── app/
│   │   ├── layout.tsx       ← Root layout: ClerkProvider + ConvexProvider + Toaster
│   │   ├── page.tsx         ← Main chat page (fully wired to Convex hooks)
│   │   ├── providers.tsx    ← Client-side provider component
│   │   ├── globals.css      ← Global CSS (copied from Lovable UI kit)
│   │   ├── sign-in/         ← Clerk sign-in page
│   │   ├── sign-up/         ← Clerk sign-up page
│   │   └── api/
│   │       └── webhooks/
│   │           └── clerk/
│   │               └── route.ts  ← Clerk → Convex user sync webhook
│   │
│   ├── components/
│   │   └── chat/            ← All Lovable UI components (adapted for Next.js)
│   │       ├── ChatSidebar.tsx       (+ New Conversation button)
│   │       ├── ChatWindow.tsx        (+ live typing users prop)
│   │       ├── MessageInput.tsx      (+ onTyping / onStopTyping callbacks)
│   │       ├── MessageBubble.tsx
│   │       ├── ConversationItem.tsx
│   │       ├── TypingIndicator.tsx
│   │       ├── StatusDot.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingEmoji.tsx
│   │       └── NewConversationDialog.tsx  ← NEW: search + start DM
│   │
│   ├── hooks/               ← Data hooks (Convex queries/mutations wrappers)
│   │   ├── useCurrentUser.ts
│   │   ├── useConversations.ts
│   │   ├── useMessages.ts
│   │   ├── useTyping.ts
│   │   ├── usePresence.ts
│   │   ├── useUserSearch.ts
│   │   └── useIsMobile.ts
│   │
│   ├── types/
│   │   └── chat.ts          ← AppUser, AppMessage, AppConversation + UI adapters
│   └── lib/
│       └── utils.ts         ← cn() utility
│
├── middleware.ts             ← Clerk auth middleware (protects all routes)
├── .env.example             ← Environment variable template
└── .env.local               ← Local secrets (not committed)
```

---

## Data Flow

```
Browser                    Convex Cloud             Clerk
  │                            │                      │
  │ ── useQuery(listMessages) ─▶ messages query        │
  │ ◀── realtime push ─────────│ (auto-updates)        │
  │                            │                      │
  │ ── useMutation(sendMsg) ──▶ sendMessage mutation   │
  │                            │── insert message      │
  │                            │── update unreadCount  │
  │                            │── broadcast to all    │
  │                            │   subscribers         │
  │                            │                      │
  │ ── onChange keystroke ────▶ setTyping mutation     │
  │ ◀── useQuery(getTyping) ───│ (5s TTL filtering)    │
  │                            │                      │
  │   [page load]              │                   Webhook
  │                            │◀── user.created ──────│
  │                            │── upsertUser          │
```

---

## Realtime Features

| Feature | Implementation |
|---|---|
| Live messages | `useQuery(api.messages.listMessages)` — Convex pushes updates automatically |
| Typing indicators | `setTyping` mutation on keystroke + `getTypingUsers` query with 5 s TTL |
| Online presence | `updatePresence` mutation on mount/heartbeat/unload + `visibilitychange` |
| Unread badges | Incremented on `sendMessage` for all non-sender members; reset on `markConversationRead` |
| User sync | Clerk webhook → `/api/webhooks/clerk` → Convex `upsertUser` mutation |

---

## Setup Guide

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account (free tier available)
- A [Clerk](https://clerk.com) account (free tier available)

---

### Step 1 — Install dependencies

```bash
cd chat-app
npm install
```

---

### Step 2 — Create a Convex project

```bash
npx convex dev
```

This will:
1. Ask you to log in to Convex
2. Create a new project (or link an existing one)
3. Generate `convex/_generated/` (the typed API client)
4. Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local` automatically

Keep this terminal open — it syncs your schema changes in real time.

---

### Step 3 — Configure Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → Create Application
2. Copy your **Publishable Key** and **Secret Key**
3. Add them to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Configure Clerk JWT for Convex

1. In Clerk dashboard → **Configure** → **JWT Templates** → **New template**
2. Choose **Convex** from the list
3. Copy the **Issuer URL** (e.g. `https://your-app.clerk.accounts.dev`)
4. Add it to `.env.local`:

```
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

5. Update `convex/auth.config.ts` — the `domain` is already set to read from the env var

---

### Step 4 — Configure the Clerk Webhook (user sync)

1. In Clerk dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://your-domain.com/api/webhooks/clerk`
   - For local dev: use [ngrok](https://ngrok.com) or [Clerk's local webhook testing](https://clerk.com/docs/integrations/webhooks/sync-data)
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** → add to `.env.local`:

```
CLERK_WEBHOOK_SECRET=whsec_...
```

> **Note for local development:** Run `npx svix listen --url http://localhost:3000/api/webhooks/clerk` to forward Clerk webhooks to your dev server.

---

### Step 5 — Run the app

In two separate terminals:

**Terminal 1 — Convex dev server:**
```bash
npx convex dev
```

**Terminal 2 — Next.js dev server:**
```bash
npm run dev:next
```

Or run both together:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables Reference

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Auto-set by `npx convex dev`; or Convex Dashboard → Settings |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk Dashboard → JWT Templates → Convex template |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → your endpoint |

---

## Deployment

### Deploy Convex backend

```bash
npm run convex:deploy
```

### Deploy Next.js to Vercel

```bash
npx vercel
```

Add all `.env.local` variables to your Vercel project's environment variables.

Update your Clerk Webhook endpoint URL to your production domain.

---

## UI Components — What Changed

All existing UI components are preserved. The only additions/modifications are:

| Component | Change |
|---|---|
| `MessageInput` | Added `onTyping` and `onStopTyping` optional props |
| `ChatWindow` | Added `typingUsers`, `onTyping`, `onStopTyping` optional props |
| `ChatSidebar` | Added `onNewConversation` optional prop + UserPlus button |
| `NewConversationDialog` | **New component** — user search + start DM |
| `page.tsx` | Fully wired to Convex hooks (replaces mock data) |

---

## Extending

### Add group conversations
- Add a `type: "dm" | "group"` field to the conversations schema
- Add a `name` field for group chats
- Update `listConversations` to handle multiple members

### Add message read receipts
- Add a `readBy: Id<"users">[]` field to messages
- Create a `markMessageRead` mutation

### Add push notifications
- Use Convex scheduled functions to send web push notifications when a user is offline

### Add file attachments
- Use [Convex file storage](https://docs.convex.dev/file-storage) to upload and serve files
