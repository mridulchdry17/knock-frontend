"use client";

import { cn } from "@/lib/utils";
import type { SaveState } from "@/lib/preferences/use-preferences";

/**
 * Tiny "Saved" microcopy that appears next to a section header during/after
 * autosave. 13px ink-3 per spec, fades after 2s (the timer lives in the hook).
 */
export function SavedPill({ state }: { state: SaveState }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "text-small text-ink-3 transition-opacity duration-300",
        state === "idle" ? "opacity-0" : "opacity-100",
      )}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
    </span>
  );
}
