"use client";

import { Status } from "@/types/chat";

const statusConfig: Record<
  Status,
  { bg: string; pulse: boolean; label: string; opacity?: string }
> = {
  online:  { bg: "bg-online",  pulse: true,  label: "Online" },
  idle:    { bg: "bg-idle",    pulse: false, label: "Away" },
  dnd:     { bg: "bg-dnd",     pulse: false, label: "Do not disturb" },
  offline: { bg: "bg-offline", pulse: false, label: "Offline", opacity: "opacity-60" },
};

interface StatusDotProps {
  status: Status;
  size?: "sm" | "md";
}

const StatusDot = ({ status, size = "sm" }: StatusDotProps) => {
  const { bg, pulse, label, opacity } = statusConfig[status] ?? statusConfig.offline;
  const dim = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span
      className={`relative inline-flex rounded-full ${dim}`}
      title={label}
      aria-label={label}
    >
      {/* Pulse ring — only for "online" */}
      {pulse && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bg} opacity-60`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full border-2 border-sidebar ${dim} ${bg} ${opacity ?? ""}`}
      />
    </span>
  );
};

export default StatusDot;
