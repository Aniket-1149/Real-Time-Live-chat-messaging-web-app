"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Settings, UserPlus, LogOut, User } from "lucide-react";
import ConversationItem from "./ConversationItem";
import EmptyState from "./EmptyState";
import StatusDot from "./StatusDot";
import type { UIConversation, UICurrentUser } from "@/types/ui";

interface SidebarProps {
  conversations: UIConversation[];
  activeId: string | null;
  currentUser: UICurrentUser;
  onOpenConversation: (id: string) => void;
  onSearchUser: (query: string) => void;
  /** Called when user clicks the "New Conversation" button */
  onNewConversation?: () => void;
  /** Called when user clicks "Sign Out" in the settings menu */
  onSignOut?: () => void;
  className?: string;
}

const ChatSidebar = ({
  conversations,
  activeId,
  currentUser,
  onOpenConversation,
  onSearchUser,
  onNewConversation,
  onSignOut,
  className = "",
}: SidebarProps) => {
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const filtered = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`flex flex-col bg-sidebar h-full ${className}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <div className="flex-1 flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearchUser(e.target.value);
            }}
            placeholder="Search conversations..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            title="New conversation"
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5 mt-1">
        {filtered.length === 0 ? (
          search ? (
            <EmptyState type="no-results" />
          ) : (
            <EmptyState type="no-conversations" />
          )
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onOpenConversation={onOpenConversation}
            />
          ))
        )}
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-border flex items-center gap-3 relative">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full bg-secondary"
          />
          <span className="absolute -bottom-0.5 -right-0.5">
            <StatusDot status={currentUser.status} size="md" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{currentUser.status}</p>
        </div>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          title="Settings"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* Settings dropdown */}
        {settingsOpen && (
          <div
            ref={settingsRef}
            className="absolute bottom-14 right-3 z-50 w-52 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          >
            {/* Profile header inside dropdown */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 mt-0.5">
                <StatusDot status={currentUser.status} size="sm" />
                {currentUser.status}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                onClick={() => setSettingsOpen(false)}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                Profile
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                onClick={() => {
                  setSettingsOpen(false);
                  onSignOut?.();
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
