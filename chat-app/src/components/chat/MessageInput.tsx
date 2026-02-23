"use client";

import { useState, KeyboardEvent, useRef } from "react";
import { Send, Smile, Loader2 } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  /** Called on every keystroke so the parent can report typing to Convex */
  onTyping?: () => void;
  /** Called when the input loses focus or message is sent */
  onStopTyping?: () => void;
}

const MessageInput = ({ onSendMessage, onTyping, onStopTyping }: MessageInputProps) => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    onStopTyping?.();
    setIsSending(true);
    try {
      await onSendMessage(trimmed);
      setText("");
      // Re-focus after send so the user can type the next message immediately
      textareaRef.current?.focus();
    } catch {
      // Error is already logged by the parent — just re-enable the button
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="px-4 py-3 bg-input-bg border-t border-border">
      <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2">
        <button
          onClick={() => console.log("Emoji picker placeholder")}
          disabled={isSending}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors p-1 flex-shrink-0 mb-0.5"
        >
          <Smile className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => onStopTyping?.()}
          placeholder="Type a message..."
          rows={1}
          disabled={isSending}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground disabled:opacity-60 text-sm resize-none outline-none max-h-32 py-1"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || isSending}
          className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors p-1 flex-shrink-0 mb-0.5"
          aria-label="Send message"
        >
          {isSending
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
