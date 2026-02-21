"use client";

import { formatDistanceToNow } from "date-fns";
import StatusDot from "./StatusDot";
import { Status } from "@/types/chat";

interface ConversationUser {
  id: string;
  name: string;
  avatar: string;
  status: Status;
}

interface Conversation {
  id: string;
  user: ConversationUser;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onOpenConversation: (id: string) => void;
}

const ConversationItem = ({ conversation, isActive, onOpenConversation }: ConversationItemProps) => {
  const { user, lastMessage, lastMessageTime, unreadCount } = conversation;

  return (
    <button
      onClick={() => onOpenConversation(conversation.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${
        isActive ? "bg-sidebar-active/20 text-foreground" : "hover:bg-sidebar-hover text-sidebar-foreground"
      }`}
    >
      <div className="relative flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-secondary" />
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={user.status} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{user.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(lastMessageTime, { addSuffix: false })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMessage}</p>
      </div>
      {unreadCount > 0 && (
        <span className="bg-unread text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
          {unreadCount}
        </span>
      )}
    </button>
  );
};

export default ConversationItem;
