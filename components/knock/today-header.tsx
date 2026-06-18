"use client";

import * as React from "react";
import { DailyCounter } from "@/components/knock/daily-counter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TodayHeaderProps {
  /** Daily cap (7 free / 15 paid). null while loading — count renders as "—". */
  cap: number | null;
  sentToday: number | null;
  loading?: boolean;
  /** Count of cards currently in `ready` status. Drives button enabled state. */
  readyCount?: number;
  /** Total non-default+non-sent count (used to gate "Mark all ready" affordance). */
  defaultCount?: number;
  onSend?: () => void;
  onMarkAllReady?: () => void;
  /** When set, shows a 13px ink-3 hint "Press ? for shortcuts" next to the date. */
  showShortcutHint?: boolean;
}

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function eyebrowFor(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Sticky 96px header for /today. F.5b adds:
 *  - real "Send today's batch" primary button (Flint solid), disabled when readyCount===0
 *  - tooltip on disabled state: "Mark cards ready to send today's batch."
 *  - "Mark all ready" ghost when ≥10 cards in default state
 *  - first-7-sessions hint "Press ? for shortcuts"
 *
 * The 3s undo + Sonner toast lives at the page layer (page owns useToday).
 */
export function TodayHeader({
  cap,
  sentToday,
  loading,
  readyCount = 0,
  defaultCount = 0,
  onSend,
  onMarkAllReady,
  showShortcutHint,
}: TodayHeaderProps) {
  const [eyebrow, setEyebrow] = React.useState<string | null>(null);
  React.useEffect(() => {
    setEyebrow(eyebrowFor(new Date()));
  }, []);

  const headlineCount = loading || cap == null ? "—" : String(cap);
  const sendDisabled = readyCount === 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center border-b border-line bg-paper/80 px-gutter py-4 backdrop-blur lg:h-24 lg:px-8",
      )}
    >
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="hidden text-caption text-ink-3 lg:block">
              {eyebrow}
              {showShortcutHint ? (
                <span className="ml-2 text-ink-3">· Press ? for shortcuts</span>
              ) : null}
            </p>
          ) : null}
          <h1 className="text-h1 text-ink">
            {headlineCount} {cap === 1 ? "email" : "emails"} drafted for today.
          </h1>
          <p className="hidden text-small text-ink-2 lg:block">
            We wrote each one — skim, tweak anything, then send when you&apos;re ready.
          </p>
        </div>

        <div className="flex items-center gap-3 lg:gap-4">
          <DailyCounter
            sent={sentToday ?? 0}
            cap={cap ?? 7}
            loading={loading || cap == null || sentToday == null}
          />
          {defaultCount >= 10 && onMarkAllReady ? (
            <Button variant="ghost" size="sm" onClick={onMarkAllReady} className="hidden lg:inline-flex">
              Mark all ready
            </Button>
          ) : null}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={sendDisabled ? 0 : -1} aria-label="Approve today's batch">
                  <Button
                    size="sm"
                    onClick={onSend}
                    disabled={sendDisabled || !onSend}
                    className="w-full lg:w-[320px]"
                  >
                    Approve today&apos;s batch
                  </Button>
                </span>
              </TooltipTrigger>
              {sendDisabled ? (
                <TooltipContent>Mark cards ready to approve today&apos;s batch.</TooltipContent>
              ) : (
                <TooltipContent>We&apos;ll send them through the day, ~1/hour.</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
