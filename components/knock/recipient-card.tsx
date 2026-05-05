"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/knock/status-pill";
import { cn } from "@/lib/utils";
import type { TodayItem } from "@/lib/today/types";

interface RecipientCardProps {
  item: TodayItem;
  /** Forwarded ref so AvatarStrip can scroll into view. */
  cardRef?: (el: HTMLElement | null) => void;
  className?: string;
}

function formatSendTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatHoursUntil(iso: string): { ago: number; until: number } {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMs = t - now;
  const until = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  // Default cooldown is 36h; "ago" = 36 - until, clamped at 0.
  const ago = Math.max(0, 36 - until);
  return { ago, until };
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
 * Read-only RecipientCard for F.5a. F.5b extends this with edit affordances,
 * Mark-ready / Skip / Send buttons, and the per-card edit Sheet.
 *
 * Sent cards collapse to a one-line summary per the spec.
 */
export function RecipientCard({ item, cardRef, className }: RecipientCardProps) {
  const { recipient, status } = item;
  const displayName = recipient.name ?? recipient.email;
  const sendTimeLabel = formatSendTime(item.send_time);

  // Sent: collapsed single-line summary, ink-3 13px.
  if (status === "sent") {
    return (
      <article
        ref={cardRef ?? undefined}
        data-card-id={item.id}
        className={cn(
          "rounded-md border border-line bg-paper-2 px-card py-3 text-small text-ink-3",
          className,
        )}
        aria-label={`Sent to ${displayName} at ${item.sent_at ? formatSendTime(item.sent_at) : sendTimeLabel}`}
      >
        Sent to {displayName} at {item.sent_at ? formatSendTime(item.sent_at) : sendTimeLabel}
      </article>
    );
  }

  return (
    <article
      ref={cardRef ?? undefined}
      data-card-id={item.id}
      className={cn(
        "relative flex flex-col gap-4 rounded-md border border-line bg-paper p-card shadow-xs",
        className,
      )}
      aria-label={`Card for ${displayName}`}
    >
      <div className="absolute right-card top-card">
        <StatusPill status={status} />
      </div>

      <header className="flex items-start gap-3 pr-24">
        <Avatar className="h-12 w-12">
          {recipient.avatar_url ? <AvatarImage src={recipient.avatar_url} alt="" /> : null}
          <AvatarFallback>{initials(recipient.name, recipient.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-medium leading-6 text-ink">
            {displayName}
          </h3>
          <p className="truncate text-[15px] leading-[22px] text-ink-2">
            {recipient.role ? `${recipient.role} · ` : ""}
            {recipient.company}
          </p>
        </div>
      </header>

      {status === "cooldown" && item.cooldown_until ? (
        <CooldownNote name={recipient.name ?? recipient.company} cooldownUntil={item.cooldown_until} />
      ) : null}

      <div className="rounded-sm bg-paper-2 px-3 py-2 text-small text-ink-2">
        {recipient.email}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-h3 text-ink">{item.subject}</div>
        <p className="line-clamp-4 whitespace-pre-line text-body text-ink-2">
          {item.body_preview}
        </p>
        {/* Expand affordance is a no-op in F.5a; F.5b will open the per-card editor Sheet. */}
        <button
          type="button"
          className="self-start text-small text-flint underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          aria-label="Expand full body (coming in F.5b)"
          disabled
        >
          Expand
        </button>
      </div>

      <footer className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Template: {item.template_name}</Badge>
        <Badge tone="neutral">Sends around {sendTimeLabel}</Badge>
        {recipient.linkedin_url ? (
          <a
            href={recipient.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-small text-flint underline-offset-4 hover:underline"
          >
            LinkedIn
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </footer>
    </article>
  );
}

function CooldownNote({ name, cooldownUntil }: { name: string; cooldownUntil: string }) {
  const { ago, until } = formatHoursUntil(cooldownUntil);
  return (
    <p className="rounded-sm bg-ochre-tint px-3 py-2 text-small text-ochre">
      <strong className="font-medium">{name}</strong> was contacted from this platform {ago}h ago.
      Available to reach in {until}h.
    </p>
  );
}
