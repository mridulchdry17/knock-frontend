"use client";

/**
 * Passive nudge dot the sidebar renders next to the "Today" nav item when
 * the user's Gmail isn't connected. Doubles state with a tooltip-ready label
 * so it isn't color-only.
 */
export function GmailDisconnectedDot({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Gmail disconnected"
      title="Gmail disconnected"
      className={
        "inline-block h-2 w-2 rounded-full bg-ochre " + (className ?? "")
      }
    />
  );
}
