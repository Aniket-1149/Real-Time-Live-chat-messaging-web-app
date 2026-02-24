import { Id } from "@/convex/_generated/dataModel";

/** User presence status */
export type Status = "online" | "idle" | "dnd" | "offline";

/** Convex user record shape (profile only — no presence fields) */
export interface AppUser {
  _id: Id<"users">;
  clerkId: string;
  name: string;
  email: string;
  imageUrl: string;
  displayName?: string;
  /** Presence status — joined from the presence table in enriched queries */
  status: Status;
  lastSeenAt: number;
}

/** Grouped reaction as returned by reactions.getReactions */
export interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  selfReacted: boolean;
}

/** Message as returned by messages.listMessages (enriched) */
export interface AppMessage {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  senderName: string;
  senderImageUrl: string;
  /** null when the message is a soft-delete tombstone */
  text: string | null;
  /** Explicit send timestamp (Unix ms) — always use this for display */
  sentAt: number;
  deleted: boolean;
  deletedAt?: number | null;
  edited: boolean;
  editedAt?: number | null;
  replyToId?: Id<"messages"> | null;
}

/** DM/Group conversation as returned by conversations.listConversations */
export interface AppConversation {
  _id: Id<"conversations">;
  _creationTime: number;
  type: "dm" | "group";
  participantIds: Id<"users">[];
  lastMessageText?: string;
  lastMessageTime?: number;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
  lastReadAt?: number | null;
  lastReadMessageId?: Id<"messages"> | null;
  memberCount: number;
  /** DM only — the other participant enriched with presence */
  otherUser?: AppUser;
  /** Group only */
  name?: string;
  imageUrl?: string;
}
