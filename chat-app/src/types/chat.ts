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

/** DM conversation as returned by conversations.listConversations */
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
  /** DM only */
  otherUser?: AppUser;
  /** Group only */
  name?: string;
  imageUrl?: string;
}

// ── Adapters ──────────────────────────────────────────────────────────────
// Convert Convex data → the prop shapes the UI components expect.

/** Converts AppConversation → the `Conversation` shape the sidebar expects */
export function toUIConversation(conv: AppConversation) {
  const isDM = conv.type === "dm" && conv.otherUser;

  return {
    id: conv._id as string,
    type: conv.type,
    user: isDM
      ? {
          id: conv.otherUser!._id as string,
          name: conv.otherUser!.displayName ?? conv.otherUser!.name,
          avatar: conv.otherUser!.imageUrl,
          status: conv.otherUser!.status as Status,
        }
      : {
          id: conv._id as string,
          name: conv.name ?? "Group",
          avatar:
            conv.imageUrl ??
            `https://api.dicebear.com/9.x/identicon/svg?seed=${conv._id}`,
          status: "online" as Status,
        },
    lastMessage: conv.lastMessageText ?? "",
    lastMessageTime: conv.lastMessageTime
      ? new Date(conv.lastMessageTime)
      : new Date(conv._creationTime),
    unreadCount: conv.unreadCount,
    memberCount: conv.memberCount,
  };
}

/** Converts AppMessage → the `Message` shape the chat window expects */
export function toUIMessage(msg: AppMessage, currentUserId: Id<"users">) {
  return {
    id: msg._id as string,
    senderId: msg.senderId === currentUserId ? "me" : (msg.senderId as string),
    senderName: msg.senderName,
    senderImageUrl: msg.senderImageUrl,
    text: msg.deleted ? "This message was deleted" : (msg.text ?? ""),
    /** Use explicit sentAt — falls back to _creationTime for legacy rows */
    timestamp: new Date(msg.sentAt ?? msg._creationTime),
    deleted: msg.deleted,
    edited: msg.edited,
    editedAt: msg.editedAt ? new Date(msg.editedAt) : null,
    replyToId: msg.replyToId ?? null,
  };
}

