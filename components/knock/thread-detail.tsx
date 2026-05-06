"use client";

import * as React from "react";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReplyComposer } from "@/components/knock/reply-composer";
import { ApiError } from "@/lib/api/errors";
import { relativeTime } from "@/lib/format/relative-time";
import type {
  ReplyResult,
  ThreadDetail as ThreadDetailType,
  ThreadMessage,
} from "@/lib/inbox/types";
import { cn } from "@/lib/utils";

export interface ThreadDetailProps {
  thread: ThreadDetailType;
  /** Sends a reply. Resolves on success (caller may toast). Rejects on failure. */
  onSendReply: (bodyHtml: string) => Promise<ReplyResult>;
  /** Mark the thread done/archive. Caller handles routing afterwards. */
  onMarkDone: () => Promise<void>;
  /** Optimistic append/rollback hooks from useThread. */
  appendOptimistic: (msg: ThreadMessage) => void;
  rollbackOptimistic: (id: string) => void;
  className?: string;
}

/**
 * Thread detail pane — sticky header (sender + actions), scrollable
 * messages, suggested-followup card, reply composer at bottom.
 *
 * Backend sanitizes message body_html before serving; we render it via
 * dangerouslySetInnerHTML — input is server-trusted. (If we ever swap to
 * a non-Gmail provider that doesn't sanitize, swap this to DOMPurify.)
 */
export function ThreadDetail({
  thread,
  onSendReply,
  onMarkDone,
  appendOptimistic,
  rollbackOptimistic,
  className,
}: ThreadDetailProps) {
  const [composerInitialBody, setComposerInitialBody] = React.useState("");
  const [composerKey, setComposerKey] = React.useState(0);
  const [doingDone, setDoingDone] = React.useState(false);

  const senderName = thread.sender.name ?? thread.sender.email;
  const senderInitial = (senderName || "?").trim().charAt(0).toUpperCase();
  const senderSubtitle = formatSubtitle(thread.sender);
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(thread.id)}`;

  const handleSend = async (bodyHtml: string) => {
    const tempId = `optim-${Date.now()}`;
    appendOptimistic({
      id: tempId,
      direction: "outbound",
      from: { name: "You", email: "you@example.com" },
      body_html: bodyHtml,
      sent_at: new Date().toISOString(),
    });
    try {
      await onSendReply(bodyHtml);
      toast.success("Reply sent. Nice.");
    } catch (err) {
      rollbackOptimistic(tempId);
      // Rethrow so the composer surfaces the locked snag voice itself.
      throw err;
    }
  };

  const handleMarkDone = async () => {
    setDoingDone(true);
    try {
      await onMarkDone();
      toast.success("Marked done.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "We hit a snag. Try again in a moment.";
      toast.error(message);
    } finally {
      setDoingDone(false);
    }
  };

  const applySuggested = (asIs: boolean) => {
    if (!thread.suggested_followup) return;
    const body = thread.suggested_followup.body_html;
    if (asIs) {
      void handleSend(body).catch(() => {
        // toast handled in handleSend's catch via composer; but here we're firing directly.
        toast.error("We hit a snag sending. Try again.");
      });
      return;
    }
    setComposerInitialBody(body);
    setComposerKey((k) => k + 1);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-testid="thread-detail">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-paper px-card py-card">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="mt-0.5 h-9 w-9">
            <AvatarFallback>{senderInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-h3 text-ink">{senderName}</p>
            {senderSubtitle ? (
              <p className="truncate text-body text-ink-2">{senderSubtitle}</p>
            ) : null}
            <p className="mt-0.5 truncate text-small text-ink-3">{thread.subject}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleMarkDone()}
            disabled={doingDone}
            data-testid="mark-done-btn"
          >
            Mark done
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden />
              Open in Gmail
            </a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <MoreHorizontal size={16} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  toast.message("Mute is coming soon.");
                }}
              >
                Mute thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable thread body */}
      <div className="flex-1 overflow-y-auto px-card py-card">
        <ul className="flex flex-col gap-4">
          {thread.messages.map((m) => (
            <li key={m.id}>
              <MessageCard message={m} />
            </li>
          ))}
        </ul>

        {thread.suggested_followup ? (
          <div
            className="mt-6 flex flex-col gap-3 rounded-md border border-dashed border-bordeaux-tint bg-bordeaux-tint/20 p-card"
            data-testid="suggested-followup"
          >
            <p className="text-body text-ink">
              <strong>
                Knock drafted a gentle follow-up for day{" "}
                {extractDay(thread.suggested_followup.reason)}. Edit, send, or skip.
              </strong>
            </p>
            <div
              className="prose-sm rounded-[14px] bg-paper p-4 text-body text-ink"
              dangerouslySetInnerHTML={{
                __html: thread.suggested_followup.body_html,
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => applySuggested(false)}>
                Edit & send
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleMarkDone()}>
                Skip
              </Button>
              <Button variant="ghost" size="sm" onClick={() => applySuggested(true)}>
                Send as-is
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Reply composer */}
      <ReplyComposer
        key={composerKey}
        onSend={handleSend}
        initialBody={composerInitialBody}
      />
    </div>
  );
}

function MessageCard({ message }: { message: ThreadMessage }) {
  const fromName = message.from.name ?? message.from.email;
  const initial = (fromName || "?").trim().charAt(0).toUpperCase();
  const isOutbound = message.direction === "outbound";
  return (
    <article
      className={cn(
        "rounded-md border border-line bg-paper p-card",
        isOutbound && "bg-paper-2",
      )}
      data-direction={message.direction}
    >
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <p className="text-small font-medium text-ink">{fromName}</p>
          {isOutbound ? (
            <span
              aria-label="Sent from Knock"
              title="Sent from Knock"
              className="h-1.5 w-1.5 rounded-pill bg-ember"
            />
          ) : null}
        </div>
        <time className="text-caption text-ink-3" dateTime={message.sent_at}>
          {relativeTime(message.sent_at)}
        </time>
      </header>
      <div
        className="prose-sm text-body text-ink"
        // Backend-sanitized HTML (Gmail's sanitized body). See top-of-file note.
        dangerouslySetInnerHTML={{ __html: message.body_html }}
      />
    </article>
  );
}

function formatSubtitle(sender: ThreadDetailType["sender"]): string {
  const bits: string[] = [];
  if (sender.role) bits.push(sender.role);
  if (sender.company) bits.push(sender.company);
  return bits.join(" · ");
}

function extractDay(reason: string): string {
  // Reason looks like "5 days since you emailed" — pluck the first integer.
  const match = reason.match(/(\d+)/);
  return match ? match[1] : "—";
}

export function ThreadDetailSkeleton() {
  return (
    <div
      className="flex h-full flex-col"
      aria-label="Loading thread"
      data-testid="thread-detail-skeleton"
    >
      <div className="border-b border-line px-card py-card">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-card py-card">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    </div>
  );
}
