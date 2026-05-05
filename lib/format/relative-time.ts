/**
 * Format an ISO datetime as a short relative-time string ("3m ago", "2h ago",
 * "5d ago", "Jan 12"). No external deps. Caller passes `now` for testability.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  if (Number.isNaN(ms)) return "—";

  const sec = Math.round(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  // Older: absolute date.
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
