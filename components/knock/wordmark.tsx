import { cn } from "@/lib/utils";

/**
 * Upright wordmark — used in app shell ≤24px.
 * Tilted variant (marketing site, ≥40px) intentionally NOT here; tilt looks
 * like a render bug at small sizes.
 *
 * v0 placeholder: Inter Display 700 lowercase "knock" in --ember.
 * Swap to designed SVG when wordmark-upright.svg lands.
 */
export function Wordmark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("font-semibold tracking-tight text-ember leading-none lowercase", className)}
      style={{ fontSize: size }}
      aria-label="Knock"
    >
      knock
    </span>
  );
}
