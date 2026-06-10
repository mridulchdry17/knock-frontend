"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TodayItem } from "@/lib/today/types";
import { statusDotColorClass } from "@/components/knock/status-pill";

interface AvatarStripProps {
  items: TodayItem[];
  /** ID of the active card (highlighted with a 2px Flint ring). */
  activeId?: string | null;
  /** Total expected slots (cap). Used so the strip pre-allocates 7/15 dots even on partial batches. */
  cap: number;
  /** Smooth-scroll-to-card on click. Page wires this with refs. */
  onJump?: (cardId: string) => void;
  className?: string;
  /** Render skeleton dots in place of avatars. */
  loading?: boolean;
}

function initialsFrom(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Sticky avatar mini-strip below the header. 32px circles with a 2px status
 * dot bottom-right. Click an avatar → smooth-scrolls to its RecipientCard.
 *
 * On 15-avatar paid view, becomes horizontally scrollable with a fade-edge
 * gradient on the right; on mobile, always horizontal-scroll.
 */
export function AvatarStrip({
  items,
  activeId,
  cap,
  onJump,
  className,
  loading,
}: AvatarStripProps) {
  // While loading, show `cap` neutral skeleton dots so layout doesn't reflow.
  if (loading) {
    return (
      <div
        className={cn("relative w-full overflow-x-auto", className)}
        aria-hidden
      >
        <div className="flex min-w-max items-center gap-2 px-gutter py-3 lg:px-8">
          {Array.from({ length: cap }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 animate-pulse rounded-pill bg-paper-2"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Paid cap is now 15; anything above free (7) reads as paid view.
  const isPaid = cap > 7;

  return (
    <div
      className={cn(
        "relative w-full",
        isPaid && "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-paper after:to-transparent",
        className,
      )}
      role="navigation"
      aria-label="Today's batch — jump to card"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-gutter py-3 lg:px-8",
          // Mobile: always horizontal scroll. Desktop free (7): static row; paid (20): scrolls.
          "overflow-x-auto lg:overflow-x-visible",
          isPaid && "lg:overflow-x-auto",
        )}
      >
        {items.map((item, idx) => {
          const isActive = item.id === activeId;
          const initials = initialsFrom(item.recipient.name, item.recipient.email);
          const displayName = item.recipient.name ?? item.recipient.email;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump?.(item.id)}
              aria-label={`Card ${idx + 1}, ${displayName}, ${item.status}`}
              className={cn(
                "relative shrink-0 rounded-pill outline-none transition focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                isActive && "ring-2 ring-flint ring-offset-2 ring-offset-paper",
              )}
            >
              <Avatar className="h-8 w-8">
                {item.recipient.avatar_url ? (
                  <AvatarImage src={item.recipient.avatar_url} alt="" />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-pill border-2 border-paper",
                  statusDotColorClass(item.status),
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
