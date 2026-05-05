import * as React from "react";
import Link from "next/link";
import { Search, Sun, Trophy } from "lucide-react";
import { EmptyState } from "@/components/knock/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Top-level empty-state variant for /today. Pure presentational.
 * Microcopy locked from UI spec — do not paraphrase.
 */
export type TodayEmptyVariant =
  | "no-batch-yet"
  | "no-matches"
  | "limit-reached-free"
  | "limit-reached-paid";

interface TodayEmptyStateProps {
  variant: TodayEmptyVariant;
  /** Local skip handler for no-matches "Skip today" button (F.5a: local flip; F.5b: backend wired). */
  onSkipToday?: () => void;
}

function IconPuck({
  tone,
  children,
}: {
  tone: "ember" | "moss" | "ink";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-pill",
        tone === "ember" && "bg-ember-tint text-flint",
        tone === "moss" && "bg-moss-tint text-moss",
        tone === "ink" && "bg-paper-2 text-ink-2",
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

export function TodayEmptyState({ variant, onSkipToday }: TodayEmptyStateProps) {
  switch (variant) {
    case "no-batch-yet":
      return (
        <EmptyState
          icon={
            <IconPuck tone="ember">
              <Sun size={28} strokeWidth={1.5} />
            </IconPuck>
          }
          title="Your first batch is being matched."
          body="You'll see it within a week of approval."
        />
      );
    case "no-matches":
      return (
        <EmptyState
          icon={
            <IconPuck tone="ink">
              <Search size={28} strokeWidth={1.5} />
            </IconPuck>
          }
          title="Nothing fresh today."
          body="Your filters are specific — that's okay. We'll keep looking. Want to widen the net?"
          primary={
            <Button asChild>
              <Link href="/preferences">Adjust preferences</Link>
            </Button>
          }
          secondary={
            onSkipToday ? (
              <Button variant="ghost" onClick={onSkipToday}>
                Skip today
              </Button>
            ) : null
          }
        />
      );
    case "limit-reached-free":
      return (
        <EmptyState
          icon={
            <IconPuck tone="moss">
              <Trophy size={28} strokeWidth={1.5} />
            </IconPuck>
          }
          title="That's your 7 for today. See you tomorrow."
          body={
            <span className="text-small text-ink-3">
              Next batch unlocks at 6:00 AM your time.
            </span>
          }
        />
      );
    case "limit-reached-paid":
      return (
        <EmptyState
          icon={
            <IconPuck tone="moss">
              <Trophy size={28} strokeWidth={1.5} />
            </IconPuck>
          }
          title="That's your 20 for today. See you tomorrow."
          body={
            <span className="text-small text-ink-3">
              Next batch unlocks at 6:00 AM your time.
            </span>
          }
        />
      );
  }
}
