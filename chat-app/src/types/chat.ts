import { Id } from "@/convex/_generated/dataModel";

/** User presence status */
export type Status = "online" | "idle" | "dnd" | "offline";

/** Convex user record shape (as returned by queries) */
export interface AppUser {
  _id: Id<"users">;
  clerkId: string;
  name: string;
  email: string;
  imageUrl: string;
  status: Status;
  lastSeenAt: number;
}

/** Reaction shape (Convex-native) */
export interface Reaction {
  emoji: string;
  userIds: Id<"users">[];
}

/** Message as returned by listMessages query */
export interface AppMessage {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  senderName: string;
  senderImageUrl: string;
  text: string;
  reactions?: Reaction[];
  deleted?: boolean;
}

/** Conversation as returned by listConversations query */
export interface AppConversation {
  _id: Id<"conversations">;
  _creationTime: number;
  participantIds: Id<"users">[];
  lastMessageText?: string;
  lastMessageTime?: number;
  otherUser: AppUser;
  unreadCount: number;
}

// ── Adapters ──────────────────────────────────────────────────────────────
// These convert Convex data shapes → the prop shapes expected by UI components.

/** Converts AppConversation → the `Conversation` shape the UI components expect */
export function toUIConversation(conv: AppConversation) {
  return {
    id: conv._id as string,
    user: {
      id: conv.otherUser._id as string,
      name: conv.otherUser.name,
      avatar: conv.otherUser.imageUrl,
      status: conv.otherUser.status as Status,
    },
    lastMessage: conv.lastMessageText ?? "",
    lastMessageTime: conv.lastMessageTime
      ? new Date(conv.lastMessageTime)
      : new Date(conv._creationTime),
    unreadCount: conv.unreadCount,
  };
}

/** Converts AppMessage → the `Message` shape the UI components expect */
export function toUIMessage(msg: AppMessage, currentUserId: Id<"users">) {
  return {
    id: msg._id as string,
    senderId: msg.senderId === currentUserId ? "me" : (msg.senderId as string),
    text: msg.text,
    timestamp: new Date(msg._creationTime),
    reactions: msg.reactions?.map((r) => ({
      emoji: r.emoji,
      count: r.userIds.length,
    })),
  };
}
