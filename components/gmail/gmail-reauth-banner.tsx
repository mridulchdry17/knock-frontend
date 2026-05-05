"use client";

import Link from "next/link";

/**
 * Global banner shown on every authenticated route when a 401 from /api/v1/*
 * has been classified as Gmail-token revoked (session still alive). Ochre-tint
 * surface, locked microcopy.
 */
export function GmailReauthBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-ochre-tint border-b border-ochre/30 px-card lg:px-gutter py-3 text-small text-ink"
    >
      <div className="flex items-center justify-between gap-3">
        <span>Gmail needs a quick reconnect.</span>
        <Link
          href="/connect-gmail?reauth=1"
          className="text-flint font-medium underline-offset-4 hover:underline"
        >
          Reconnect
        </Link>
      </div>
    </div>
  );
}
