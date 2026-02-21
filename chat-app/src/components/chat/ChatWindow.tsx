"use client";

import { useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import EmptyState from "./EmptyState";
import StatusDot from "./StatusDot";
import { Status } from "@/types/chat";

interface ConversationUser {
  id: string;
  name: string;
  avatar: string;
  status: Status;
}

interface ConversationData {
  id: string;
  user: ConversationUser;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  reactions?: { emoji: string; count: number }[];
}

interface ChatWindowProps {
  conversation: ConversationData | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
  showBack: boolean;
  /** Names of users currently typing (from Convex real-time query) */
  typingUsers?: { userId: string; name: string }[];
  onTyping?: () => void;
  onStopTyping?: () => void;
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
}: ChatWindowProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState type="no-messages" />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === "me"}
              senderAvatar={user.avatar}
              senderName={user.name}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicators (live from Convex) */}
      {typingUsers.map((t) => (
        <TypingIndicator key={t.userId} name={t.name} />
      ))}

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
