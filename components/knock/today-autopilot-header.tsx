"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TodayAutopilotHeaderProps {
  cap: number;
  sentToday: number;
  /** True when the user has paused autopilot; flips header to paused-mid-day variant. */
  paused: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onSwitchToManual?: () => void;
}

/**
 * Autopilot variant of /today header. Two states:
 *
 *  - Active:  "Autopilot · X of Y sent today" / "Knock will send N more through
 *             the afternoon." / [Pause autopilot] (Bordeaux outline)
 *  - Paused:  "Autopilot paused · X of Y sent" / "Resume to send the remaining
 *             N today, or leave paused to switch back to manual." /
 *             [Resume autopilot] + [Switch to manual review]
 *
 * Mobile: collapses to two lines + sticky bottom button.
 */
export function TodayAutopilotHeader({
  cap,
  sentToday,
  paused,
  onPause,
  onResume,
  onSwitchToManual,
}: TodayAutopilotHeaderProps) {
  const remaining = Math.max(0, cap - sentToday);

  if (paused) {
    return (
      <header
        className={cn(
          "sticky top-0 z-20 flex items-center border-b border-line bg-paper/80 px-gutter py-4 backdrop-blur lg:h-24 lg:px-8",
        )}
      >
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <h1 className="text-h1 text-ink">
              Autopilot paused · {sentToday} of {cap} sent
            </h1>
            <p className="hidden text-small text-ink-2 lg:block">
              Resume to send the remaining {remaining} today, or leave paused to switch back to manual.
            </p>
            <p className="text-small text-ink-2 lg:hidden">
              {remaining} more queued for today
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <Button size="sm" onClick={onResume}>
              Resume autopilot
            </Button>
            <Button variant="ghost" size="sm" onClick={onSwitchToManual}>
              Switch to manual review
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center border-b border-line bg-paper/80 px-gutter py-4 backdrop-blur lg:h-24 lg:px-8",
      )}
    >
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 text-ink lg:block hidden">
            Autopilot · {sentToday} of {cap} sent today
          </h1>
          {/* Mobile collapsed two-line variant */}
          <div className="lg:hidden">
            <p className="text-h2 text-flint">{sentToday} of {cap} sent</p>
            <p className="text-small text-ink-2">{remaining} more coming today</p>
          </div>
          <p className="hidden text-small text-ink-2 lg:block">
            Knock will send {remaining} more through the afternoon.
          </p>
        </div>
        <div className="lg:flex lg:items-center">
          {/* Desktop: inline button. Mobile: sticky bottom button (rendered below header). */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onPause}
            className="hidden border-bordeaux text-bordeaux hover:bg-bordeaux-tint lg:inline-flex"
          >
            Pause autopilot
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onPause}
            className="fixed inset-x-0 bottom-16 z-30 mx-gutter w-auto border-bordeaux text-bordeaux hover:bg-bordeaux-tint lg:hidden"
          >
            Pause autopilot
          </Button>
        </div>
      </div>
    </header>
  );
}
