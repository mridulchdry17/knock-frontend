import { cn } from "@/lib/utils";

/**
 * Knock logomark — the tilted "k". Ink stem (the door/jamb) + Ember knocking
 * arm leaning +6° (shared DNA with the wordmark's tilted second k).
 *
 * Theme-aware: the stem uses the `ink` token and flips to paper in dark mode
 * automatically (CSS-var driven); the arm stays Ember.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-6 w-6", className)}
      role="img"
      aria-label="Knock"
    >
      <rect x="30" y="16" width="14" height="68" rx="7" fill="var(--ink)" />
      <path
        d="M70 26 L44 53 L70 84"
        fill="none"
        stroke="var(--ember)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(6 44 53)"
      />
    </svg>
  );
}
