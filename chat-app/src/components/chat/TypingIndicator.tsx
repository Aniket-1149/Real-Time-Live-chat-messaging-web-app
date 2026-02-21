"use client";

const TypingIndicator = ({ name }: { name: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
    <span>{name} is typing</span>
    <span className="flex gap-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
    </span>
  </div>
);

export default TypingIndicator;
