import { cn } from "@/lib/utils";

/**
 * Marketing wordmark — lowercase "knock" in Ember, with the second k tilted
 * +6° on a baseline pivot (the knock motif). Tilted variant is for the
 * marketing hero/footer only; in-app shells use an upright treatment.
 *
 * The tilt is a CSS transform, so it flattens to upright under
 * `prefers-reduced-motion` (the global reduce rule zeroes transforms) — that
 * is harmless: it still reads "knock".
 */
export function Wordmark({
  className,
  tilted = true,
}: {
  className?: string;
  tilted?: boolean;
}) {
  return (
    <span
      aria-label="Knock"
      className={cn(
        "select-none font-semibold tracking-tight text-ember",
        className,
      )}
    >
      <span aria-hidden="true">knoc</span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block origin-bottom-left",
          tilted && "rotate-[6deg]",
        )}
      >
        k
      </span>
    </span>
  );
}
