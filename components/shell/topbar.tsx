"use client";

import { Wordmark } from "@/components/knock/wordmark";

interface TopBarProps {
  title?: string;
  /** Single context action — used by individual screens (mobile especially). */
  action?: React.ReactNode;
}

/**
 * Shared topbar for desktop (56px) and mobile (48px). v0 is intentionally
 * sparse — the spec says topbar is "mostly empty" pre-cmdk. Page-level
 * actions slot in via `action`.
 */
export function TopBar({ title, action }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper px-card lg:px-gutter h-12 lg:h-14"
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="lg:hidden">
          <Wordmark size={18} />
        </span>
        {title ? <h1 className="truncate text-h3 text-ink">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <a
          href="#"
          className="hidden lg:inline text-small text-ink-3 hover:text-ink"
        >
          What&apos;s new
        </a>
      </div>
    </header>
  );
}
