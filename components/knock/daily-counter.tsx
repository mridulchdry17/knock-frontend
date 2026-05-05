import * as React from "react";
import { cn } from "@/lib/utils";

interface DailyCounterProps {
  /** Cards already sent today. */
  sent: number;
  /** Daily cap (7 free / 20 paid). */
  cap: number;
  className?: string;
  /** When true, render an indeterminate skeleton bar (used while loading). */
  loading?: boolean;
}

/**
 * "X of 7 sent today" pill with a thin Ember progress sliver underneath.
 * Microcopy locked: "X of N sent today" — see UI spec microcopy table.
 */
export function DailyCounter({ sent, cap, className, loading }: DailyCounterProps) {
  const pct = cap > 0 ? Math.min(100, Math.round((sent / cap) * 100)) : 0;
  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <span
        className="rounded-pill border border-line-2 bg-paper-2 px-3 py-1 text-caption font-medium text-ink-2"
        aria-live="polite"
      >
        {loading ? "— of — sent today" : `${sent} of ${cap} sent today`}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={loading ? undefined : sent}
        aria-label="Daily send progress"
        className="h-0.5 w-32 overflow-hidden rounded-pill bg-line"
      >
        <div
          className="h-full bg-ember transition-all duration-200"
          style={{ width: `${loading ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}
