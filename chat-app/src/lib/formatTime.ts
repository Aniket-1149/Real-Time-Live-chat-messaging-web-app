import {
  format,
  isToday,
  isYesterday,
  isThisYear,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";

/**
 * Formats a timestamp for display inside a message bubble.
 *
 * Rules
 * ─────
 *  • Same day          → "3:45 PM"
 *  • Yesterday         → "Yesterday 3:45 PM"
 *  • This year         → "Feb 18, 3:45 PM"
 *  • Different year    → "Feb 18 2024, 3:45 PM"
 */
export function formatMessageTime(date: Date): string {
  if (isToday(date))     return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  if (isThisYear(date))  return format(date, "MMM d, h:mm a");
  return format(date, "MMM d yyyy, h:mm a");
}

/**
 * Formats a timestamp for the conversation sidebar list preview.
 *
 * Shows the most compact representation possible:
 *
 *  • < 1 minute ago    → "just now"
 *  • < 60 minutes ago  → "42m"
 *  • Same day          → "3:45 PM"
 *  • Yesterday         → "Yesterday"
 *  • This year         → "Feb 18"
 *  • Different year    → "Feb 18 2024"
 */
export function formatConversationTime(date: Date): string {
  const now = new Date();

  const minutesAgo = differenceInMinutes(now, date);
  if (minutesAgo < 1)  return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m`;

  if (isToday(date))     return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  if (isThisYear(date))  return format(date, "MMM d");
  return format(date, "MMM d yyyy");
}

/**
 * Full human-readable absolute timestamp.
 * Used in tooltips and accessibility labels.
 *
 * Always includes the full date, time, and year.
 * e.g. "Monday, February 18 2026 at 3:45 PM"
 */
export function formatFullTimestamp(date: Date): string {
  return format(date, "EEEE, MMMM d yyyy 'at' h:mm a");
}
