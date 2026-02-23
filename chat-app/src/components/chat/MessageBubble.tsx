"use client";

import { Pencil } from "lucide-react";
import { formatMessageTime, formatFullTimestamp } from "@/lib/formatTime";

interface Reaction {
  emoji: string;
  count: number;
}

export interface Message {
  id: string;
  senderId: string;        // "me" | userId
  senderName: string;
  senderImageUrl: string;
  text: string;
  timestamp: Date;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: Date | null;
  reactions?: Reaction[];
  replyToId?: string | null;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Fallback avatar when senderImageUrl is empty */
  senderAvatar?: string;
  senderName?: string;
}

const MessageBubble = ({ message, isOwn, senderAvatar, senderName }: MessageBubbleProps) => {
  const avatar = message.senderImageUrl || senderAvatar;
  const name   = senderName ?? message.senderName;

  return (
    <div className={`flex gap-2 animate-fade-in ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar — only shown for incoming messages */}
      {!isOwn && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={name}
          className="w-8 h-8 rounded-full flex-shrink-0 mt-1 bg-secondary object-cover"
        />
      )}

      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {/* Sender name — only for incoming group messages */}
        {!isOwn && name && (
          <span className="text-[11px] font-medium text-muted-foreground px-1 truncate">
            {name}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            message.deleted
              ? "bg-secondary/40 text-muted-foreground italic"
              : isOwn
              ? "bg-message-own text-message-own-fg rounded-br-md"
              : "bg-message-other text-message-other-fg rounded-bl-md"
          }`}
        >
          {message.text}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {message.reactions.map((r, i) => (
              <span
                key={i}
                className="bg-secondary/80 rounded-full px-1.5 py-0.5 text-xs flex items-center gap-0.5 cursor-pointer hover:bg-secondary transition-colors"
              >
                {r.emoji} <span className="text-muted-foreground">{r.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Timestamp + edited badge */}
        <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span
            className="text-[10px] text-muted-foreground"
            title={formatFullTimestamp(message.timestamp)}
          >
            {formatMessageTime(message.timestamp)}
          </span>
          {message.edited && !message.deleted && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70"
              title={message.editedAt ? `Edited ${formatFullTimestamp(message.editedAt)}` : "Edited"}
            >
              <Pencil className="w-2.5 h-2.5" />
              edited
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
