"use client";

import Link from "next/link";

/**
 * Contextual banner — F.5 mounts this above /today's content area when the
 * user is disconnected (explicitly, not reauth). Subtler paper-2 surface so
 * /today still feels usable.
 */
export function GmailDisconnectedBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-line bg-paper-2 px-card py-3 text-small text-ink"
    >
      <div className="flex items-center justify-between gap-3">
        <span>Sending is paused — Gmail isn’t connected.</span>
        <Link
          href="/connect-gmail"
          className="text-flint font-medium underline-offset-4 hover:underline"
        >
          Connect Gmail
        </Link>
      </div>
    </div>
  );
}
