/**
 * Shared UI prop-shape types.
 *
 * These interfaces describe the data that UI components (ChatSidebar,
 * ConversationItem, ChatWindow, MessageBubble, etc.) accept as props.
 * They are deliberately decoupled from the Convex/database types in
 * `chat.ts` — the adapter layer in `lib/adapters.ts` converts between
 * the two.
 *
 * Rule: UI components MUST import from here. They must NOT redefine
 *       equivalent interfaces locally.
 */

import type { Status } from "./chat";

// ── User shapes ────────────────────────────────────────────────────────────

/** A participant shown in a conversation row or chat header. */
export interface UIConversationUser {
  id: string;
  name: string;
  avatar: string;
  status: Status;
}

/** The authenticated user shown in the sidebar footer. */
export interface UICurrentUser {
  id: string;
  name: string;
  avatar: string;
  status: Status;
}

// ── Conversation shapes ────────────────────────────────────────────────────

/**
 * A conversation row as rendered by the sidebar list.
 *
 * Supports both DMs and group chats:
 *  - DM:    `user` is the other participant; `groupName`/`groupAvatar` are absent
 *  - Group: `user` holds the group avatar/name; `memberCount` is always set
 */
export interface UIConversation {
  id: string;
  type: "dm" | "group";
  /** Primary display user — other participant for DMs, synthetic for groups. */
  user: UIConversationUser;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  /** Total member count (including the current user). */
  memberCount: number;
}

// ── Message shapes ─────────────────────────────────────────────────────────

/** A single reaction pill rendered on a message bubble. */
export interface UIReaction {
  emoji: string;
  count: number;
}

/**
 * A message as rendered by MessageBubble.
 *
 * `senderId` is normalised to `"me"` for the current user, or the raw
 * Convex user ID for anyone else.
 */
export interface UIMessage {
  id: string;
  /** "me" | rawConvexUserId */
  senderId: string;
  senderName: string;
  senderImageUrl: string;
  text: string;
  timestamp: Date;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: Date | null;
  reactions?: UIReaction[];
  replyToId?: string | null;
}

// ── Typing shapes ──────────────────────────────────────────────────────────

/** A user that is currently typing in a conversation. */
export interface UITypingUser {
  userId: string;
  name: string;
}
