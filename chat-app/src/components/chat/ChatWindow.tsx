"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ArrowLeft, Phone, Video, MoreVertical, ArrowDown } from "lucide-react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import EmptyState from "./EmptyState";
import StatusDot from "./StatusDot";
import type { UIConversation, UIMessage, UITypingUser } from "@/types/ui";

/** How many pixels from the bottom counts as "near bottom". */
const NEAR_BOTTOM_THRESHOLD = 120;

interface ChatWindowProps {
  conversation: UIConversation | null;
  messages: UIMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onBack: () => void;
  showBack: boolean;
  /** Users currently typing in this conversation. */
  typingUsers?: UITypingUser[];
  onTyping?: () => void;
  onStopTyping?: () => void;
  /**
   * sentAt of the newest message in the conversation.
   * Provided by the backend getConversationMeta query.
   * When this value changes, a new message has arrived.
   */
  latestMessageSentAt?: number | null;
  /**
   * How many messages have sentAt > user's lastReadAt.
   * Drives the "↓ N new" jump button label.
   */
  incomingUnreadCount?: number;
  /** The current user's ID — used to distinguish own vs incoming messages. */
  currentUserId?: string;
}

const ChatWindow = ({
  conversation,
  messages,
  onSendMessage,
  onBack,
  showBack,
  typingUsers = [],
  onTyping,
  onStopTyping,
  latestMessageSentAt,
  incomingUnreadCount = 0,
  currentUserId,
}: ChatWindowProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Whether the scroll position is close enough to the bottom to auto-scroll.
  const isNearBottomRef = useRef(true);
  // The latestMessageSentAt value from the previous render cycle.
  const prevLatestSentAtRef = useRef<number | null | undefined>(latestMessageSentAt);
  // The conversation ID from the previous render — used to hard-scroll on open.
  const prevConvIdRef = useRef<string | null | undefined>(conversation?.id);

  // Show the "↓ N new" button when the user is scrolled up and new messages arrived.
  const [showJumpButton, setShowJumpButton] = useState(false);
  // Label count: how many unread messages the backend reports.
  const [jumpCount, setJumpCount] = useState(0);

  // ── Track near-bottom on scroll ──────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom <= NEAR_BOTTOM_THRESHOLD;

    // Hide the jump button once the user scrolls back to the bottom.
    if (isNearBottomRef.current) {
      setShowJumpButton(false);
      setJumpCount(0);
    }
  }, []);

  // ── Hard-scroll when switching conversations ─────────────────────────────
  useEffect(() => {
    if (conversation?.id !== prevConvIdRef.current) {
      prevConvIdRef.current = conversation?.id;
      isNearBottomRef.current = true;
      setShowJumpButton(false);
      setJumpCount(0);
      // Instant jump — no animation — so the user lands at the bottom
      // immediately on conversation open.
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [conversation?.id]);

  // ── Smart scroll when latestMessageSentAt changes ────────────────────────
  useEffect(() => {
    const justArrived =
      latestMessageSentAt !== undefined &&
      latestMessageSentAt !== prevLatestSentAtRef.current;

    prevLatestSentAtRef.current = latestMessageSentAt;

    if (!justArrived || messages.length === 0) return;

    // Detect if the newest message was sent by the current user.
    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg?.senderId === "me";

    if (isOwnMessage || isNearBottomRef.current) {
      // Scroll smoothly to bottom.
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowJumpButton(false);
      setJumpCount(0);
    } else {
      // Incoming message while scrolled up — show the jump button.
      setShowJumpButton(true);
      setJumpCount(incomingUnreadCount || 1);
    }
  }, [latestMessageSentAt, messages, incomingUnreadCount]);

  // Keep jump count in sync when incomingUnreadCount updates while the
  // button is already visible (e.g. multiple messages arrive quickly).
  useEffect(() => {
    if (showJumpButton) {
      setJumpCount(incomingUnreadCount);
    }
  }, [incomingUnreadCount, showJumpButton]);

  // ── Jump-to-bottom handler ───────────────────────────────────────────────
  const handleJumpToBottom = useCallback(() => {
    isNearBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpButton(false);
    setJumpCount(0);
  }, []);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg">
        <EmptyState type="no-messages" />
      </div>
    );
  }

  const { user } = conversation;

  return (
    <div className="flex-1 flex flex-col bg-chat-bg min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        {showBack && (
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full bg-secondary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{user.name}</span>
            <StatusDot status={user.status} />
          </div>
          <span className="text-xs text-muted-foreground capitalize">{user.status}</span>
        </div>
        <div className="flex items-center gap-1">
          {([Phone, Video, MoreVertical] as const).map((Icon, i) => (
            <button
              key={i}
              onClick={() => console.log("Action placeholder")}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages — scroll container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4 relative"
      >
        {messages.length === 0 ? (
          <EmptyState type="no-messages" />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === "me"}
              senderAvatar={msg.senderImageUrl || user.avatar}
              senderName={msg.senderName || user.name}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump-to-bottom button — shown when scrolled up with new messages */}
      {showJumpButton && (
        <div className="relative">
          <button
            onClick={handleJumpToBottom}
            aria-label={`Jump to ${jumpCount > 0 ? `${jumpCount} new message${jumpCount !== 1 ? "s" : ""}` : "latest message"}`}
            className="
              absolute bottom-2 left-1/2 -translate-x-1/2 z-10
              flex items-center gap-1.5 px-3 py-1.5
              bg-primary text-primary-foreground
              text-xs font-medium rounded-full shadow-lg
              hover:bg-primary/90 active:scale-95
              transition-all duration-150 animate-slide-up
            "
          >
            <ArrowDown className="w-3.5 h-3.5" />
            {jumpCount > 0
              ? `${jumpCount} new message${jumpCount !== 1 ? "s" : ""}`
              : "Jump to latest"}
          </button>
        </div>
      )}

      {/* Typing indicator — single component handles 0-N typers */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
      />
    </div>
  );
};

export default ChatWindow;
