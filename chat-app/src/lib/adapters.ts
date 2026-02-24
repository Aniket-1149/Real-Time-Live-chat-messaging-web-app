/**
 * Adapter layer — converts Convex backend types (AppConversation, AppMessage)
 * into the flat UI prop shapes (UIConversation, UIMessage) that components
 * consume.
 *
 * Rules:
 *  • All Convex→UI conversions live HERE.
 *  • UI components import UIConversation / UIMessage from `@/types/ui`.
 *  • UI components never import AppConversation / AppMessage.
 *  • page.tsx (and only page.tsx) calls these adapters.
 */

import type { Id } from "@/convex/_generated/dataModel";
import type { AppConversation, AppMessage, Status } from "@/types/chat";
import type { UIConversation, UIMessage } from "@/types/ui";

// ── Conversation adapter ───────────────────────────────────────────────────

/**
 * Converts a raw AppConversation (from the Convex backend) into the
 * UIConversation shape that ChatSidebar / ConversationItem render.
 *
 * Group support:
 *  - type === "group"  → uses conv.name / conv.imageUrl; falls back to
 *    a seeded identicon URL; status is always "online" (aggregated).
 *  - type === "dm"     → derives everything from conv.otherUser.
 */
export function toUIConversation(conv: AppConversation): UIConversation {
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
          // Group: synthesise a "user" object from group metadata so the
          // sidebar doesn't need to branch on type.
          id: conv._id as string,
          name: conv.name ?? "Group",
          avatar:
            conv.imageUrl ??
            `https://api.dicebear.com/9.x/identicon/svg?seed=${conv._id}`,
          // Groups show as "online" — individual member presence is
          // surfaced per-message in the window, not in the sidebar row.
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

// ── Message adapter ────────────────────────────────────────────────────────

/**
 * Converts a raw AppMessage into the UIMessage shape that MessageBubble
 * renders.
 *
 *  senderId is normalised:
 *    currentUserId → "me"
 *    anyone else   → raw Convex user ID string
 *
 *  Deleted messages get a placeholder text so the bubble can render
 *  "This message was deleted" without any conditional logic in the
 *  component.
 */
export function toUIMessage(
  msg: AppMessage,
  currentUserId: Id<"users">
): UIMessage {
  return {
    id: msg._id as string,
    senderId: msg.senderId === currentUserId ? "me" : (msg.senderId as string),
    senderName: msg.senderName,
    senderImageUrl: msg.senderImageUrl,
    text: msg.deleted ? "This message was deleted" : (msg.text ?? ""),
    // Always prefer the explicit sentAt timestamp; fall back to
    // _creationTime for any rows written before sentAt was added.
    timestamp: new Date(msg.sentAt ?? msg._creationTime),
    deleted: msg.deleted,
    edited: msg.edited,
    editedAt: msg.editedAt ? new Date(msg.editedAt) : null,
    replyToId: msg.replyToId ?? null,
  };
}
