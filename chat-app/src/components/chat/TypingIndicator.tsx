"use client";

interface TypingUser {
  userId: string;
  name: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

/**
 * Builds a human-readable label from a list of typing users.
 *
 *   []              → null          (renders nothing)
 *   ["Alice"]       → "Alice is typing"
 *   ["Alice","Bob"] → "Alice and Bob are typing"
 *   ["Alice","Bob","Carol"] → "Alice, Bob and 1 other are typing"
 *   [4+ users]      → "Alice, Bob and 2 others are typing"
 */
function buildLabel(users: TypingUser[]): string | null {
  if (users.length === 0) return null;
  if (users.length === 1) return `${users[0].name} is typing`;
  if (users.length === 2) return `${users[0].name} and ${users[1].name} are typing`;

  const others = users.length - 2;
  return `${users[0].name}, ${users[1].name} and ${others} other${others > 1 ? "s" : ""} are typing`;
}

/** Three-dot bounce animation rendered inline to keep the component self-contained */
const BouncingDots = () => (
  <span className="flex items-end gap-0.5 ml-0.5">
    {[0, 0.15, 0.3].map((delay, i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse-dot"
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </span>
);

const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  const label = buildLabel(typingUsers);
  if (!label) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground animate-slide-up"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{label}</span>
      <BouncingDots />
    </div>
  );
};

export default TypingIndicator;
