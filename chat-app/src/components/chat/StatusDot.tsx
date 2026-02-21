"use client";

import { Status } from "@/types/chat";

const statusColors: Record<Status, string> = {
  online: "bg-online",
  idle: "bg-idle",
  dnd: "bg-dnd",
  offline: "bg-offline",
};

interface StatusDotProps {
  status: Status;
  size?: "sm" | "md";
}

const StatusDot = ({ status, size = "sm" }: StatusDotProps) => (
  <span
    className={`rounded-full border-2 border-sidebar block ${
      size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"
    } ${statusColors[status]}`}
  />
);

export default StatusDot;
