"use client";

import { useState, useEffect } from "react";

const emojis = ["🤖", "💬", "🚀", "🔥", "🎉", "🦄", "⚡", "✨", "💜", "🌈"];

const LoadingEmoji = () => {
  const [emoji, setEmoji] = useState(emojis[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <span className="text-6xl animate-emoji-pop" key={emoji}>
        {emoji}
      </span>
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );
};

export default LoadingEmoji;
