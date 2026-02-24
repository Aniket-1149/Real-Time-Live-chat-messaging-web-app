"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { X, Search, Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { useUserSearch } from "@/hooks/useUserSearch";
import StatusDot from "./StatusDot";
import { Id } from "@/convex/_generated/dataModel";
import { Status, AppConversation } from "@/types/chat";

interface NewConversationDialogProps {
  onClose: () => void;
  /**
   * Called when the user selects someone.
   * `existingConvId` is set when a DM already exists — the caller can
   * navigate instantly without a mutation round-trip.
   */
  onStartConversation: (
    userId: Id<"users">,
    existingConvId: Id<"conversations"> | null
  ) => void;
  /** Live conversations list from useConversations() — used to detect existing DMs. */
  conversations: AppConversation[] | undefined;
}

export default function NewConversationDialog({
  onClose,
  onStartConversation,
  conversations,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced realtime search — empty string returns ALL other users
  const users = useUserSearch(query);

  // Build a Map of userId → existing DM conversationId
  const existingDmMap = useMemo<Map<string, Id<"conversations">>>(() => {
    const map = new Map<string, Id<"conversations">>();
    if (!conversations) return map;
    for (const c of conversations) {
      if (c.type === "dm" && c.otherUser) {
        map.set(c.otherUser._id as string, c._id as Id<"conversations">);
      }
    }
    return map;
  }, [conversations]);

  // Reset focused item whenever results change
  useEffect(() => setFocusedIndex(0), [users]);

  // Focus the input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!users?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const focused = users[focusedIndex];
        if (focused) {
          const existingConvId = existingDmMap.get(focused._id as string) ?? null;
          onStartConversation(focused._id as Id<"users">, existingConvId);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [users, focusedIndex, onStartConversation, onClose]
  );

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${focusedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (userId: Id<"users">) => {
      const existingConvId = existingDmMap.get(userId as string) ?? null;
      onStartConversation(userId, existingConvId);
    },
    [existingDmMap, onStartConversation]
  );

  // Decide what to show in the list area
  const isLoading = users === undefined;
  const isEmpty   = !isLoading && users.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">New Conversation</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Search input ─────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2 ring-1 ring-transparent focus-within:ring-ring transition-all">
            {isLoading && query !== ""
              ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
              : <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
              aria-label="Search users"
              role="combobox"
              aria-expanded={!isLoading}
              aria-autocomplete="list"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Results list ─────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto scrollbar-thin py-1"
          role="listbox"
          aria-label="Users"
        >
          {/* Loading skeleton — only shown while debounce is settling */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No results */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-1 py-8 text-center px-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground mt-1">
                {query ? "No users found" : "No other users yet"}
              </p>
              {query && (
                <p className="text-xs text-muted-foreground">
                  Try a different name or email address
                </p>
              )}
            </div>
          )}

          {/* Section label */}
          {!isLoading && !isEmpty && (
            <p className="px-4 pt-1 pb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {query ? `${users.length} result${users.length !== 1 ? "s" : ""}` : "All users"}
            </p>
          )}

          {/* User rows */}
          {users?.map((user: any, index: number) => {
            const alreadyChats = existingDmMap.has(user._id as string);
            const isFocused = index === focusedIndex;

            return (
              <button
                key={user._id}
                data-index={index}
                role="option"
                aria-selected={isFocused}
                onClick={() => handleSelect(user._id as Id<"users">)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isFocused ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                {/* Avatar + status dot */}
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.imageUrl}
                    alt={user.displayName ?? user.name}
                    className="w-9 h-9 rounded-full bg-secondary object-cover"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={user.status as Status} size="sm" />
                  </span>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.displayName ?? user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>

                {/* Right-side indicator */}
                {alreadyChats ? (
                  <span
                    className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0"
                    title="Existing conversation"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-online" />
                    <span className="hidden sm:inline">Chatting</span>
                  </span>
                ) : (
                  <MessageCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Footer hint ─────────────────────────────────────────────── */}
        {users && users.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              ↑↓ navigate &nbsp;·&nbsp; Enter to open &nbsp;·&nbsp; Esc to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

