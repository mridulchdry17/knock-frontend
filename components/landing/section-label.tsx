import { cn } from "@/lib/utils";

/**
 * Editorial "chapter marker" hung on the page's left spine, e.g. `01 — THE DESK`.
 * The number is Ember (display-accent), the rest muted ink. Mono for the
 * printed-margin feel.
 */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-mono text-caption uppercase text-ink-3",
        className,
      )}
    >
      <span className="text-ember">{index}</span>
      <span aria-hidden="true" className="text-line-2">
        —
      </span>
      <span>{children}</span>
    </p>
  );
}
