"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/knock/empty-state";
import { relativeTime } from "@/lib/format/relative-time";
import type { InboxItem, InboxTab } from "@/lib/inbox/types";
import { cn } from "@/lib/utils";

const TABS: { value: InboxTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "replies", label: "Replies" },
  { value: "bounces", label: "Bounces" },
  { value: "nudges", label: "Nudges" },
];

const ALL_CAUGHT_UP = "All caught up.";
const ALL_CAUGHT_UP_BODY = "When recruiters write back, you'll see them here.";

export interface InboxListProps {
  status: "loading" | "empty" | "populated" | "error";
  items: InboxItem[];
  unreadCount: number;
  tab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  syncHealthy: boolean;
  onSyncRetry: () => void;
  onErrorRetry?: () => void;
  errorMessage?: string;
  /** Show as full-width (mobile) or 360px sidebar (desktop). */
  variant: "desktop" | "mobile";
  className?: string;
}

/**
 * Left-pane (desktop) / full-screen (mobile) inbox list with tabs + 72px rows.
 * Sync-failure banner sits inline above the rows per spec.
 */
export function InboxList({
  status,
  items,
  unreadCount,
  tab,
  onTabChange,
  selectedId,
  onSelect,
  syncHealthy,
  onSyncRetry,
  onErrorRetry,
  errorMessage,
  variant,
  className,
}: InboxListProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-paper",
        variant === "desktop"
          ? "h-[calc(100vh-56px)] w-[360px] border-r border-line"
          : "h-[calc(100vh-48px-56px)] w-full",
        className,
      )}
      aria-label="Inbox list"
    >
      {/* Header + tabs */}
      <div className="border-b border-line px-card pb-2 pt-card">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-h2 text-ink">Inbox</h2>
          <span
            data-testid="unread-pill"
            className={cn(
              "inline-flex items-center rounded-pill px-3 py-0.5 text-caption font-medium",
              unreadCount > 0
                ? "bg-ember-tint text-flint"
                : "bg-paper-2 text-ink-3",
            )}
          >
            {unreadCount} unread
          </span>
        </div>
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as InboxTab)}>
          <TabsList className="border-b-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Sync-failure ochre line */}
      {!syncHealthy ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 border-b border-line bg-ochre-tint/40 px-card py-2 text-small text-ink"
          data-testid="sync-failure-banner"
        >
          <span>We can&rsquo;t sync from Gmail right now. Showing what we have.</span>
          <button
            type="button"
            onClick={onSyncRetry}
            className="text-small font-medium text-flint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto" data-testid="inbox-list-body">
        {status === "error" ? (
          <div className="flex flex-col items-center gap-3 px-card py-8 text-center">
            <p className="text-small text-ink-2">
              {errorMessage ?? "We hit a snag loading inbox."}
            </p>
            {onErrorRetry ? (
              <Button variant="ghost" size="sm" onClick={onErrorRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}

        {status === "loading" ? <ListSkeleton /> : null}

        {status === "empty" ? (
          <EmptyState
            icon={<Mail size={56} aria-hidden />}
            title={ALL_CAUGHT_UP}
            body={ALL_CAUGHT_UP_BODY}
          />
        ) : null}

        {status === "populated" ? (
          <ul className="flex flex-col" role="listbox" aria-label="Threads">
            {items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={() => onSelect(item.id)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

interface InboxRowProps {
  item: InboxItem;
  selected: boolean;
  onSelect: () => void;
}

function InboxRow({ item, selected, onSelect }: InboxRowProps) {
  const senderName = item.sender.name ?? item.sender.email;
  const initial = (senderName || "?").trim().charAt(0).toUpperCase();
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        role="option"
        aria-selected={selected}
        data-testid={`inbox-row-${item.id}`}
        data-thread-id={item.id}
        className={cn(
          "relative flex w-full items-start gap-3 border-b border-line px-card py-3 text-left transition-colors",
          "hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
          selected && "bg-ember-tint hover:bg-ember-tint",
        )}
      >
        {selected ? (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-[3px] bg-flint"
          />
        ) : null}
        {item.unread ? (
          <span
            aria-label="Unread"
            className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-pill bg-ember"
          />
        ) : null}
        <Avatar className="mt-0.5 h-8 w-8 flex-shrink-0">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-small font-medium text-ink",
                item.unread && "font-semibold",
              )}
            >
              {senderName}
            </p>
            <time
              className="flex-shrink-0 text-caption text-ink-3"
              dateTime={item.last_message_at}
            >
              {relativeTime(item.last_message_at)}
            </time>
          </div>
          <p className="mt-0.5 truncate text-small text-ink-2">{item.subject}</p>
          <div className="mt-0.5 flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 text-small text-ink-3">
              {item.snippet}
            </p>
            <CategoryChip category={item.category} />
          </div>
        </div>
      </button>
    </li>
  );
}

function CategoryChip({ category }: { category: InboxItem["category"] }) {
  const styles = {
    reply: "bg-moss-tint text-moss",
    bounce: "bg-bordeaux-tint text-bordeaux",
    nudge: "bg-ochre-tint text-ochre",
  } as const;
  const label = {
    reply: "Reply",
    bounce: "Bounce",
    nudge: "Nudge",
  } as const;
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-pill px-2 py-0.5 text-caption font-medium",
        styles[category],
      )}
    >
      {label[category]}
    </span>
  );
}

function ListSkeleton() {
  return (
    <ul aria-label="Loading inbox" className="flex flex-col">
      {[0, 1, 2, 3, 4].map((i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-b border-line px-card py-3"
        >
          <Skeleton className="h-8 w-8 rounded-pill" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
