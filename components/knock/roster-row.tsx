"use client";

import * as React from "react";
import { Check, Undo2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TodayItem } from "@/lib/today/types";

interface RosterRowProps {
  item: TodayItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onSkip?: (id: string) => void;
  onUnskip?: (id: string) => void;
  rowRef?: (el: HTMLElement | null) => void;
}

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * One tight, quiet row in the Today roster — the "who", not the message (every
 * draft uses the same template, so the recipient is what the user evaluates).
 * Status shows only as an EXCEPTION (skipped dim+strike, sent ✓); the common
 * "will send" case carries no badge, keeping the list scannable. Selecting a
 * row loads its email into the reading pane. Skip lives on the row, on hover.
 */
export function RosterRow({
  item,
  selected,
  onSelect,
  onSkip,
  onUnskip,
  rowRef,
}: RosterRowProps) {
  const { recipient, status } = item;
  const name = recipient.name ?? recipient.email;
  const skipped = status === "skipped";
  const sent = status === "sent";

  return (
    <div
      ref={rowRef}
      data-card-id={item.id}
      className={cn(
        "group relative flex items-center gap-3 border-l-2 py-2.5 pl-3 pr-2 transition-colors",
        selected ? "border-l-flint bg-paper-2" : "border-l-transparent hover:bg-paper-2",
        skipped && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-label={`Review ${name}`}
        aria-current={selected}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
      >
        <Avatar className="h-8 w-8 shrink-0">
          {recipient.avatar_url ? <AvatarImage src={recipient.avatar_url} alt="" /> : null}
          <AvatarFallback className="text-caption">
            {initials(recipient.name, recipient.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {sent ? <Check className="h-3.5 w-3.5 shrink-0 text-moss" aria-hidden /> : null}
            <span
              className={cn(
                "truncate text-[15px] font-medium leading-5 text-ink",
                skipped && "line-through",
              )}
            >
              {name}
            </span>
          </div>
          <span className="block truncate text-caption text-ink-3">
            {recipient.role ? `${recipient.role} · ` : ""}
            {recipient.company}
          </span>
        </div>
      </button>

      {/* Skip / unskip — quiet, appears on hover or when this row is selected. */}
      {sent ? null : skipped ? (
        onUnskip ? (
          <button
            type="button"
            onClick={() => onUnskip(item.id)}
            aria-label={`Bring back ${name}`}
            className="shrink-0 rounded-sm p-1 text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null
      ) : onSkip ? (
        <button
          type="button"
          onClick={() => onSkip(item.id)}
          aria-label={`Skip ${name}`}
          className={cn(
            "shrink-0 rounded-sm p-1 text-ink-3 hover:text-bordeaux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
