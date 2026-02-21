"use client";

import { format } from "date-fns";

interface Reaction {
  emoji: string;
  count: number;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  reactions?: Reaction[];
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderAvatar?: string;
  senderName?: string;
}

const MessageBubble = ({ message, isOwn, senderAvatar, senderName }: MessageBubbleProps) => (
  <div className={`flex gap-2 animate-fade-in ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
    {!isOwn && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={senderAvatar}
        alt={senderName}
        className="w-8 h-8 rounded-full flex-shrink-0 mt-1 bg-secondary"
      />
    )}
    <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
      <div
        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? "bg-message-own text-message-own-fg rounded-br-md"
            : "bg-message-other text-message-other-fg rounded-bl-md"
        }`}
      >
        {message.text}
      </div>
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex gap-1 mt-1">
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
      <span className="text-[10px] text-muted-foreground mt-1 px-1">
        {format(message.timestamp, "h:mm a")}
      </span>
    </div>
  </div>
);

export default MessageBubble;
