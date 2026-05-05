"use client";

import * as React from "react";

interface UndoToastProps {
  /** Headline copy. Locked microcopy comes from caller. */
  message: string;
  /** Total ms before auto-finalize (3000 in v0). */
  durationMs?: number;
  /** Click handler for the [Undo] action. */
  onUndo: () => void;
  /** Visually-hidden but keyboard-reachable label for the undo button. */
  undoLabel?: string;
}

const RING_RADIUS = 9;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

/**
 * Sonner custom toast: copy + [Undo] action with a Flint stroke-dashoffset
 * countdown ring around a circular dismiss icon. Drains counter-clockwise
 * over `durationMs` (3s default).
 *
 * Live `aria-live="polite"` so screen readers announce both the headline and
 * the undo affordance. Ring is decorative (`aria-hidden`).
 */
export function UndoToast({
  message,
  durationMs = 3000,
  onUndo,
  undoLabel = "Undo send",
}: UndoToastProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs]);

  const dashoffset = RING_CIRC * progress;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-md border border-line bg-paper px-4 py-3 shadow-md"
    >
      <span className="text-small text-ink">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        aria-label={undoLabel}
        className="ml-auto inline-flex items-center gap-2 rounded-sm px-2 py-1 text-small font-medium text-flint hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Undo
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          aria-hidden
          className="shrink-0"
        >
          <circle
            cx="11"
            cy="11"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="2"
          />
          <circle
            cx="11"
            cy="11"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 11 11)"
          />
        </svg>
      </button>
    </div>
  );
}
