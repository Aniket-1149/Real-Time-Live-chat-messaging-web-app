"use client";

import { MessageSquare, Search, Users } from "lucide-react";

interface EmptyStateProps {
  type: "no-conversations" | "no-messages" | "no-results";
}

const config = {
  "no-conversations": {
    icon: Users,
    title: "No conversations yet",
    description: "Start chatting with someone to see your conversations here.",
    emoji: "👋",
  },
  "no-messages": {
    icon: MessageSquare,
    title: "No messages yet",
    description: "Send a message to start the conversation!",
    emoji: "💬",
  },
  "no-results": {
    icon: Search,
    title: "No results found",
    description: "Try a different search term.",
    emoji: "🔍",
  },
};

const EmptyState = ({ type }: EmptyStateProps) => {
  const { icon: Icon, title, description, emoji } = config[type];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 animate-fade-in">
      <span className="text-5xl mb-2">{emoji}</span>
      <Icon className="w-10 h-10 text-muted-foreground/40" />
      <h3 className="text-foreground font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-xs">{description}</p>
    </div>
  );
};

export default EmptyState;
