"use client";

import { useState, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useUserSearch } from "@/hooks/useUserSearch";
import StatusDot from "./StatusDot";
import { Id } from "@/convex/_generated/dataModel";
import { Status } from "@/types/chat";

interface NewConversationDialogProps {
  onClose: () => void;
  onStartConversation: (userId: Id<"users">) => void;
}

export default function NewConversationDialog({
  onClose,
  onStartConversation,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const users = useUserSearch(query);

  const handleSelect = useCallback(
    (userId: Id<"users">) => {
      onStartConversation(userId);
    },
    [onStartConversation]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">New Conversation</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto scrollbar-thin pb-2">
          {users === undefined && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {users !== undefined && users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {query ? "No users found" : "Start typing to search users"}
            </p>
          )}

          {users?.map((user: any) => (
            <button
              key={user._id}
              onClick={() => handleSelect(user._id as Id<"users">)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="w-9 h-9 rounded-full bg-secondary"
                />
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={user.status as Status} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
