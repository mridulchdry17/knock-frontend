import { cn } from "@/lib/utils";

/**
 * A real-looking slice of the in-app /today screen, rendered as live HTML on
 * the paper (no device/browser bezel — that reads as a stock mockup). Static
 * by design: it shows the product's core promise (a small reviewed batch you
 * approve) rather than animating.
 */

type Card = {
  initials: string;
  name: string;
  org: string;
  role: string;
  snippet: string;
  ready: boolean;
};

const CARDS: Card[] = [
  {
    initials: "PR",
    name: "Priya R.",
    org: "Figma",
    role: "Design Recruiter",
    snippet: "Hi Priya — I've been rebuilding my portfolio around design systems and saw your team's work on…",
    ready: true,
  },
  {
    initials: "DM",
    name: "Dev M.",
    org: "Stripe",
    role: "EM, Payments",
    snippet: "Hi Dev — I'm a final-year student who just shipped a small payments side-project, and your post on…",
    ready: false,
  },
];

export function BatchPreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full rounded-lg border border-line bg-paper p-card shadow-sm",
        className,
      )}
    >
      {/* header */}
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="font-mono text-caption uppercase text-ink-3">Today</span>
        <span className="text-small text-ink-2">
          <span className="text-ember">3</span> of 15 reviewed
        </span>
      </div>

      {/* avatar strip — status dots */}
      <div className="flex flex-wrap items-center gap-1 py-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full",
              i < 3 ? "bg-moss" : "bg-line-2",
            )}
          />
        ))}
      </div>

      {/* recipient cards */}
      <div className="space-y-2">
        {CARDS.map((c) => (
          <div
            key={c.name}
            className="rounded-md border border-line bg-paper-2 p-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ember-tint text-caption font-medium text-flint">
                {c.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-ink">
                  {c.name} · {c.org}
                </p>
                <p className="truncate text-caption text-ink-3">{c.role}</p>
              </div>
              {c.ready ? (
                <span className="rounded-pill bg-ember-tint px-2 py-0.5 text-caption font-medium text-flint">
                  Ready
                </span>
              ) : (
                <span className="rounded-pill border border-line-2 px-2 py-0.5 text-caption text-ink-3">
                  Review
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-caption text-ink-2">{c.snippet}</p>
          </div>
        ))}
      </div>

      {/* send bar */}
      <div className="mt-3 flex items-center justify-between rounded-md bg-flint px-3 py-2.5">
        <span className="text-small font-medium text-paper">Send today&apos;s batch</span>
        <span className="rounded-pill bg-flint-press px-2 py-0.5 text-caption font-medium text-paper">
          3 ready
        </span>
      </div>
    </div>
  );
}
