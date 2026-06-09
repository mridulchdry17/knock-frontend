"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/knock/status-pill";
import { CardEditor } from "@/components/knock/card-editor";
import { SendTimePicker } from "@/components/knock/send-time-picker";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { TodayItem, TodayItemPatch } from "@/lib/today/types";

interface RecipientCardProps {
  item: TodayItem;
  /** Forwarded ref so AvatarStrip can scroll into view. */
  cardRef?: (el: HTMLElement | null) => void;
  className?: string;
  /** When true, this card is the keyboard-active one (Flint ring outline). */
  isActive?: boolean;
  /** Render expanded on mount instead of the collapsed triage row. */
  defaultExpanded?: boolean;
  /**
   * Externally-controlled editor open state. The page owns this so keyboard `E`
   * can flip it from outside. When undefined, editor toggles via the local Edit
   * button only.
   */
  editorOpen?: boolean;
  onEditorOpenChange?: (open: boolean) => void;
  /** F.5b mutation hooks. Card stays read-only when these are absent (autopilot variant). */
  onMarkReady?: (id: string) => void;
  onMarkSkipped?: (id: string) => void;
  onMarkDefault?: (id: string) => void;
  /** Save patch (subject/body/send_time). Resolves on success, throws on failure. */
  onEditCard?: (id: string, patch: TodayItemPatch) => Promise<unknown>;
  /**
   * Autopilot variant: render the read-only autopilot card with Sent/Queued/Held
   * pills and a [Skip this one] ghost button on queued cards.
   */
  autopilot?: boolean;
  /** Autopilot-only handler for "Skip this one" on queued cards. */
  onAutopilotSkip?: (id: string) => void;
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
 * RecipientCard with the F.5b action layer:
 *   - default ↔ ready ↔ skipped state cycling
 *   - inline editor (subject + body, plain textarea)
 *   - send-time picker (popover, capped at +7 days)
 *   - sent state collapses to one-line summary
 *
 * Autopilot variant (`autopilot` prop): no Mark-ready / Edit; just Sent/Queued/
 * Held pills and an optional [Skip this one] ghost on queued cards.
 */
export function RecipientCard({
  item,
  cardRef,
  className,
  isActive,
  defaultExpanded,
  editorOpen,
  onEditorOpenChange,
  onMarkSkipped,
  onMarkDefault,
  onEditCard,
  autopilot,
  onAutopilotSkip,
}: RecipientCardProps) {
  const { recipient, status } = item;
  const displayName = recipient.name ?? recipient.email;
  const sendTimeLabel = formatSendTime(item.send_time);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  // When editorOpen is uncontrolled, fall back to local state.
  const [internalEditing, setInternalEditing] = React.useState(false);
  const editing = editorOpen ?? internalEditing;
  const setEditing = (v: boolean) => {
    if (onEditorOpenChange) onEditorOpenChange(v);
    else setInternalEditing(v);
  };

  // Triage view: cards start COLLAPSED (compact row) and expand to the full
  // review/edit view on click. Editing always forces expanded.
  const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded ?? false);
  const expanded = editing || localExpanded;

  // Sent: collapsed single-line summary, ink-3 13px.
  if (status === "sent" && !autopilot) {
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

  // Collapsed triage row — scan many fast, click to expand into the full card.
  if (!expanded) {
    return (
      <article
        ref={cardRef ?? undefined}
        data-card-id={item.id}
        className={cn(
          "rounded-md border bg-paper shadow-xs",
          status === "ready" && "border-l-[3px] border-l-flint border-line",
          status === "skipped" && "border-dashed border-line opacity-60",
          (status === "default" || status === "cooldown" || status === "held") &&
            "border-line",
          isActive && "ring-2 ring-flint ring-offset-1 ring-offset-paper",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setLocalExpanded(true)}
          aria-expanded={false}
          aria-label={`Review ${displayName} — ${item.subject}`}
          className="flex w-full items-start gap-3 px-card py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-md"
        >
          <Avatar className="h-9 w-9 shrink-0">
            {recipient.avatar_url ? <AvatarImage src={recipient.avatar_url} alt="" /> : null}
            <AvatarFallback>{initials(recipient.name, recipient.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-ink">
                {displayName}
              </span>
              <StatusPill status={status === "sent" && autopilot ? "sent" : status} />
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            </div>
            <p className="mt-0.5 truncate text-small text-ink-2">
              {recipient.role ? `${recipient.role} · ` : ""}
              {recipient.company}
              {item.subject ? ` — ${item.subject}` : ""}
            </p>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article
      ref={cardRef ?? undefined}
      data-card-id={item.id}
      className={cn(
        "relative flex flex-col gap-4 rounded-md border bg-paper p-card shadow-xs",
        // Status-driven left-bar + opacity per locked spec.
        status === "ready" && "border-l-[3px] border-l-flint border-line",
        status === "skipped" && "border-dashed border-line opacity-60",
        status === "default" && "border-line",
        status === "cooldown" && "border-line",
        status === "held" && "border-line",
        isActive && "ring-2 ring-flint ring-offset-1 ring-offset-paper",
        className,
      )}
      aria-label={`Card for ${displayName}`}
    >
      <div className="absolute right-card top-card flex items-center gap-2">
        {!editing ? (
          <button
            type="button"
            onClick={() => setLocalExpanded(false)}
            aria-label="Collapse card"
            className="rounded-sm p-0.5 text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <StatusPill
          status={status === "sent" && autopilot ? "sent" : status}
        />
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
        <CooldownNote
          name={recipient.name ?? recipient.company}
          cooldownUntil={item.cooldown_until}
        />
      ) : null}

      <div className="rounded-sm bg-paper-2 px-3 py-2 text-small text-ink-2">
        {recipient.email}
      </div>

      {editing && onEditCard ? (
        <CardEditor
          item={item}
          onSave={async (patch) => {
            await onEditCard(item.id, patch);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {item.kind === "followup" && item.parent ? (
            <OriginalThreadContext parent={item.parent} />
          ) : null}
          <div className="text-h3 text-ink">{item.subject}</div>
          <p className="line-clamp-4 whitespace-pre-line text-body text-ink-2">
            {item.body_preview}
          </p>
        </div>
      )}

      {autopilot ? (
        <p className="text-caption text-ink-3">
          Autopilot uses your templates as-is. Edit templates in /templates.
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2">
        {item.template_name ? (
          <Badge tone="neutral">Template: {item.template_name}</Badge>
        ) : (
          <Badge tone="neutral">Default message</Badge>
        )}
        {!autopilot && onEditCard ? (
          <button
            type="button"
            onClick={() => setPickerOpen((p) => !p)}
            className="inline-flex items-center rounded-pill border border-line-2 bg-paper-2 px-2 py-0.5 text-caption font-medium text-ink-2 hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={`Send time: around ${sendTimeLabel}. Click to change.`}
          >
            Sends around {sendTimeLabel}
          </button>
        ) : (
          <Badge tone="neutral">Sends around {sendTimeLabel}</Badge>
        )}
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

      {onEditCard ? (
        <>
          {/* Desktop: inline popover anchored to the card. */}
          {pickerOpen ? (
            <div className="hidden lg:absolute lg:right-card lg:top-[calc(100%-8px)] lg:z-10 lg:block">
              <SendTimePicker
                value={item.send_time}
                onApply={(iso) => {
                  setPickerOpen(false);
                  void onEditCard(item.id, { send_time: iso });
                }}
                onCancel={() => setPickerOpen(false)}
              />
            </div>
          ) : null}
          {/* Mobile: bottom sheet (per spec — easier targets, no off-screen popover). */}
          <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <SheetContent side="bottom" className="lg:hidden p-card">
              <SheetTitle className="sr-only">Send when?</SheetTitle>
              <SendTimePicker
                value={item.send_time}
                mobile
                onApply={(iso) => {
                  setPickerOpen(false);
                  void onEditCard(item.id, { send_time: iso });
                }}
                onCancel={() => setPickerOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <ActionRow
        item={item}
        editing={editing}
        autopilot={autopilot}
        onMarkSkipped={onMarkSkipped}
        onMarkDefault={onMarkDefault}
        onOpenEditor={onEditCard ? () => setEditing(true) : undefined}
        onCloseEditor={() => setEditing(false)}
        onAutopilotSkip={onAutopilotSkip}
      />
    </article>
  );
}

function ActionRow({
  item,
  editing,
  autopilot,
  onMarkSkipped,
  onMarkDefault,
  onOpenEditor,
  onCloseEditor,
  onAutopilotSkip,
}: {
  item: TodayItem;
  editing: boolean;
  autopilot?: boolean;
  onMarkSkipped?: (id: string) => void;
  onMarkDefault?: (id: string) => void;
  onOpenEditor?: () => void;
  onCloseEditor?: () => void;
  onAutopilotSkip?: (id: string) => void;
}) {
  // Cooldown / held: no actions.
  if (item.status === "cooldown" || item.status === "held") return null;

  if (autopilot) {
    if (item.status === "ready" || item.status === "default") {
      return onAutopilotSkip ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onAutopilotSkip(item.id)}>
            Skip this one
          </Button>
        </div>
      ) : null;
    }
    return null;
  }

  // Editor open: hide the action row (CardEditor owns Save/Cancel).
  if (editing) return null;

  if (item.status === "skipped") {
    if (!onMarkDefault) return null;
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => onMarkDefault(item.id)}>
          Bring back
        </Button>
      </div>
    );
  }

  // "In" (default OR ready) — skip-then-send model: no "Mark ready" busywork.
  // Every In card sends unless skipped; the only per-card actions are Edit and
  // Skip. (onMarkReady is retained on the prop for the bulk send-all flow but
  // is no longer a per-card button.)
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {onOpenEditor ? (
        <Button variant="ghost" size="sm" onClick={onOpenEditor}>
          Edit
        </Button>
      ) : null}
      {onMarkSkipped ? (
        <Button variant="ghost" size="sm" onClick={() => onMarkSkipped(item.id)}>
          Skip
        </Button>
      ) : null}
      {/* onCloseEditor reserved for the editor path; intentionally unused here. */}
      {onCloseEditor ? null : null}
    </div>
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

/** Reading-pane block shown above a follow-up draft so the user can refresh
 *  on what they originally sent. Collapsed by default to keep the pane clean —
 *  expands to a scrollable view of the original prose. Decorative (the chip in
 *  the roster + the "Re:" subject already announce "this is a follow-up").
 */
function OriginalThreadContext({
  parent,
}: {
  parent: { original_subject: string; original_body: string; original_sent_at: string };
}) {
  const daysAgo = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(parent.original_sent_at).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  return (
    <details className="rounded-sm border border-line bg-paper-2 px-3 py-2">
      <summary className="flex cursor-pointer items-center gap-2 text-small text-ink-2">
        <span aria-hidden className="text-ink-3">↳</span>
        Sent {daysAgo} day{daysAgo === 1 ? "" : "s"} ago · no reply yet
        <span className="ml-auto text-caption text-ink-3">View original</span>
      </summary>
      <div className="mt-2 max-h-[180px] overflow-y-auto overscroll-contain whitespace-pre-line text-small text-ink-3">
        {parent.original_body}
      </div>
    </details>
  );
}
