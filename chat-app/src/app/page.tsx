"use client";

// This page requires authentication — disable static prerendering
export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { useClerk } from "@clerk/nextjs";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import LoadingEmoji from "@/components/chat/LoadingEmoji";
import NewConversationDialog from "@/components/chat/NewConversationDialog";
import { useConversations, useMarkConversationRead, useGetOrCreateConversation } from "@/hooks/useConversations";
import { useMessages, useSendMessage, useConversationMeta } from "@/hooks/useMessages";
import { useTypingUsers, useTypingReporter } from "@/hooks/useTyping";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toUIConversation, toUIMessage } from "@/lib/adapters";
import { AppConversation } from "@/types/chat";
import type { UICurrentUser } from "@/types/ui";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatPage() {
  const { signOut } = useClerk();
  const { isLoading, isSyncing, user: authUser } = useAuthUser();
  const isMobile = useIsMobile();

  // Active conversation state
  const [activeConvId, setActiveConvId] = useState<Id<"conversations"> | null>(null);
  const [showNewConvDialog, setShowNewConvDialog] = useState(false);

  // Presence management (sets online/idle/offline)
  usePresence();

  // Live conversations list
  const conversations = useConversations();

  // Mark active conversation as read when opened
  useMarkConversationRead(activeConvId);

  // Live messages for active conversation
  const messages = useMessages(activeConvId);

  // Lightweight meta for smart auto-scroll (latest timestamp + unread count)
  const conversationMeta = useConversationMeta(activeConvId);

  // Typing indicator hooks
  const typingUsers = useTypingUsers(activeConvId);
  const { reportTyping, stopTyping } = useTypingReporter(activeConvId);

  // Mutations
  const sendMessageMutation = useSendMessage();
  const getOrCreateConversation = useGetOrCreateConversation();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenConversation = useCallback((convId: string) => {
    setActiveConvId(convId as Id<"conversations">);
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeConvId) return;
      try {
        await sendMessageMutation({ conversationId: activeConvId, text });
        stopTyping();
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
    [activeConvId, sendMessageMutation, stopTyping]
  );

  const handleStartConversation = useCallback(
    async (otherUserId: Id<"users">, existingConvId: Id<"conversations"> | null) => {
      try {
        // Fast path: find an already-loaded DM with this user without
        // hitting the network — avoids a mutation round-trip and prevents
        // any race-condition duplicates on the client side.
        if (existingConvId) {
          setActiveConvId(existingConvId);
          setShowNewConvDialog(false);
          return;
        }

        // Also check the live list in case the dialog's map is stale
        // (e.g. conversations loaded after the dialog was opened).
        const existing = (conversations ?? []).find(
          (c: any) =>
            c.type === "dm" &&
            c.otherUser?._id === otherUserId
        );

        if (existing) {
          setActiveConvId(existing._id as Id<"conversations">);
          setShowNewConvDialog(false);
          return;
        }

        // Slow path: conversation doesn't exist yet — let the backend
        // create it with deterministic sorted-participantIds deduplication.
        const convId = await getOrCreateConversation({ otherUserId });
        setActiveConvId(convId);
        setShowNewConvDialog(false);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    },
    [conversations, getOrCreateConversation]
  );

  // ── Loading states ─────────────────────────────────────────────────────────

  // Wait for Clerk + Convex user sync
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <LoadingEmoji />
      </div>
    );
  }

  // Clerk loaded + signed in, but Convex hasn't written the user record yet
  if (isSyncing || !authUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-background">
        <LoadingEmoji />
        <p className="text-sm text-muted-foreground animate-pulse">Setting up your account…</p>
      </div>
    );
  }

  // ── Data adapters ──────────────────────────────────────────────────────────

  const uiConversations = (conversations ?? []).map((c: any) =>
    toUIConversation(c as AppConversation)
  );

  const activeConversation = uiConversations.find((c: any) => c.id === activeConvId) ?? null;

  const uiMessages =
    authUser && messages
      ? messages.map((m: any) => toUIMessage(m as any, authUser.id as Id<"users">))
      : [];

  const currentUIUser: UICurrentUser = {
    id: authUser.id,
    name: authUser.name,
    avatar: authUser.avatar,
    status: authUser.status as "online" | "idle" | "dnd" | "offline",
  };

  // ── Responsive layout ──────────────────────────────────────────────────────

  const showChat = !isMobile || activeConvId !== null;
  const showSidebar = !isMobile || activeConvId === null;

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {showSidebar && (
        <ChatSidebar
          conversations={uiConversations}
          activeId={activeConvId as string | null}
          currentUser={currentUIUser}
          onOpenConversation={handleOpenConversation}
          onSearchUser={(query) => console.log("Search:", query)}
          onNewConversation={() => setShowNewConvDialog(true)}
          onSignOut={() => signOut({ redirectUrl: "/sign-in" })}
          className={isMobile ? "w-full" : "w-80 border-r border-border flex-shrink-0"}
        />
      )}

      {showChat && (
        <ChatWindow
          conversation={activeConversation}
          messages={uiMessages}
          onSendMessage={handleSendMessage}
          onBack={() => setActiveConvId(null)}
          showBack={isMobile}
          typingUsers={typingUsers ?? []}
          onTyping={reportTyping}
          onStopTyping={stopTyping}
          latestMessageSentAt={conversationMeta?.latestMessageSentAt ?? null}
          incomingUnreadCount={conversationMeta?.unreadCount ?? 0}
          currentUserId={authUser.id}
        />
      )}

      {showNewConvDialog && (
        <NewConversationDialog
          onClose={() => setShowNewConvDialog(false)}
          onStartConversation={handleStartConversation}
          conversations={conversations as AppConversation[] | undefined}
        />
      )}
    </div>
  );
}
