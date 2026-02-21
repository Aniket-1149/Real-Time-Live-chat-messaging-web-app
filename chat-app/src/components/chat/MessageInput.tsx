"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Smile } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  /** Called on every keystroke so the parent can report typing to Convex */
  onTyping?: () => void;
  /** Called when the input loses focus or message is sent */
  onStopTyping?: () => void;
}

const MessageInput = ({ onSendMessage, onTyping, onStopTyping }: MessageInputProps) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onStopTyping?.();
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 bg-input-bg border-t border-border">
      <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2">
        <button
          onClick={() => console.log("Emoji picker placeholder")}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 mb-0.5"
        >
          <Smile className="w-5 h-5" />
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => onStopTyping?.()}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none outline-none max-h-32 py-1"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors p-1 flex-shrink-0 mb-0.5"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
