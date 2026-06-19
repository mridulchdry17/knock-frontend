"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { GmailDisconnectedBanner } from "@/components/gmail/gmail-disconnected-banner";
import { TodayHeader } from "@/components/knock/today-header";
import { TodayAutopilotHeader } from "@/components/knock/today-autopilot-header";
import { BatchTemplatePicker } from "@/components/knock/batch-template-picker";
import { RecipientCard } from "@/components/knock/recipient-card";
import { RosterRow } from "@/components/knock/roster-row";
import { TodayEmptyState } from "@/components/knock/today-empty-state";
import { UndoToast } from "@/components/knock/undo-toast";
import { useGlobalShortcuts } from "@/components/knock/global-shortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { showSnagToast } from "@/lib/ui/snag-toast";
import { useToday, type TodayStatus } from "@/lib/today/use-today";
import { useScrollFade, bottomFadeStyle } from "@/lib/ui/use-scroll-fade";
import { useTodayShortcuts } from "@/lib/today/use-today-shortcuts";
import { pauseAutopilot, resumeAutopilot } from "@/lib/autopilot/client";
import { ApiError } from "@/lib/api/errors";
import type { TodayBatch, TodayItem, TodayItemPatch } from "@/lib/today/types";

const FIRST_BATCH_KEY = "knock.firstBatchSeen";
const SHORTCUT_HINT_KEY = "knock.shortcutHintShownCount";
const SHORTCUT_HINT_LIMIT = 7;

export default function TodayPage() {
  const { user, refresh } = useAuth();
  const today = useToday();
  const cap = today.data?.cap ?? (user?.daily_limit ?? null);
  const sent = today.data?.sent_today ?? null;
  const tier = user?.tier ?? "free";

  const isAutopilot =
    user?.tier === "paid" &&
    user?.autopilot_enabled === true &&
    !user?.autopilot_paused_at;
  const isAutopilotPaused =
    user?.tier === "paid" &&
    user?.autopilot_enabled === true &&
    Boolean(user?.autopilot_paused_at);

  const banner = user && user.gmail_connected === false ? <GmailDisconnectedBanner /> : null;

  // Shortcut hint visibility — first 7 sessions per spec.
  const [shortcutHint, setShortcutHint] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHORTCUT_HINT_KEY);
      const count = raw ? parseInt(raw, 10) : 0;
      if (count < SHORTCUT_HINT_LIMIT) {
        setShortcutHint(true);
        window.localStorage.setItem(SHORTCUT_HINT_KEY, String(count + 1));
      }
    } catch {
      // ignore
    }
  }, []);

  const { openShortcuts } = useGlobalShortcuts();

  const onAutopilotPause = React.useCallback(async () => {
    try {
      const res = await pauseAutopilot();
      // Optimistic UI: 3-second undo (resume on undo).
      const undoTimer = setTimeout(() => {
        // After 3s the pause is "committed" — refresh user so paused_at lands.
        void refresh();
      }, 3000);
      toast.custom(
        (id) => (
          <UndoToast
            message="Paused. Queued sends are on hold."
            durationMs={3000}
            undoLabel="Undo pause"
            onUndo={() => {
              clearTimeout(undoTimer);
              void resumeAutopilot()
                .then(() => refresh())
                .catch(() => {
                  showSnagToast();
                });
              toast.dismiss(id);
            }}
          />
        ),
        { duration: 3000 },
      );
      // Apply paused_at locally immediately so header swaps; refresh confirms.
      void refresh();
      void res;
    } catch {
      showSnagToast();
    }
  }, [refresh]);

  const onAutopilotResume = React.useCallback(async () => {
    try {
      await resumeAutopilot();
      await refresh();
    } catch {
      showSnagToast();
    }
  }, [refresh]);

  const onSwitchToManual = React.useCallback(async () => {
    // F.5b stub: optimistically refresh user; backend autopilot_enabled flag is
    // toggled in F.8 /preferences. For v0 this is a soft-flip via /me.
    await refresh();
    toast("Switched to manual review for today.");
  }, [refresh]);

  return (
    <AppShell title="Today" banner={banner}>
      {isAutopilot || isAutopilotPaused ? (
        <TodayAutopilotHeader
          cap={cap ?? 15}
          sentToday={sent ?? 0}
          paused={isAutopilotPaused}
          onPause={onAutopilotPause}
          onResume={onAutopilotResume}
          onSwitchToManual={onSwitchToManual}
        />
      ) : (
        <TodayHeader
          cap={cap}
          sentToday={sent}
          loading={today.status === "loading"}
          // Skip-then-send: "In" = everything not skipped/sent. Send is enabled
          // whenever there's anything In, and dispatches all of it.
          readyCount={
            today.data?.items.filter(
              (i) => i.status === "default" || i.status === "ready",
            ).length ?? 0
          }
          onSend={() => {
            // Mark every In card ready, then dispatch — "send all non-skipped".
            void today.markAllReady().finally(() => beginSendWithToast(today));
          }}
          showShortcutHint={shortcutHint}
        />
      )}
      {!isAutopilot && !isAutopilotPaused && user?.email ? (
        <div className="mx-auto flex max-w-[1100px] items-center gap-1.5 px-gutter pt-3 text-caption text-ink-3 lg:px-8">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            Sending as {user.name ?? user.email} · {user.email}
          </span>
        </div>
      ) : null}
      {today.status === "error" && today.error ? (
        <ErrorBanner message={today.error.message} onRetry={today.retry} />
      ) : null}
      <PageBody
        status={today.status}
        data={today.data}
        retry={today.retry}
        tier={tier}
        autopilot={isAutopilot || isAutopilotPaused}
        autopilotActive={isAutopilot}
        markReady={today.markReady}
        markSkipped={today.markSkipped}
        markDefault={today.markDefault}
        editCard={today.editCard}
        skipBatch={today.skipBatch}
        applyTemplate={today.applyTemplate}
        onShowCheatsheet={openShortcuts}
        onSendBatch={() => beginSendWithToast(today)}
      />
    </AppShell>
  );
}

/**
 * Kicks off the 3-second hold + Sonner UndoToast. The toast holds Undo for
 * 3000ms; if untouched, the API fires inside useToday's beginSend setTimeout.
 */
function beginSendWithToast(today: ReturnType<typeof useToday>) {
  const handle = today.beginSend();
  if (!handle) return;
  const readyCount = today.readyCount;
  toast.custom(
    (id) => (
      <UndoToast
        message={`${readyCount} email${readyCount === 1 ? "" : "s"} queued — sending through the day.`}
        durationMs={3000}
        onUndo={() => {
          handle.cancel();
          toast.custom(() => <SimpleToast message="Held. Approve when you're ready." />, {
            duration: 1500,
          });
          toast.dismiss(id);
        }}
      />
    ),
    { duration: 3000 },
  );
  // Fire-and-forget — surface failure when handle.done resolves null.
  void handle.done.then((res) => {
    if (res === null && today.sendPhase === "idle") {
      // Either user cancelled or API failed. Detect failure: if no toast was just
      // shown (cancel path always shows "Held"), this is a server failure.
      // The phase reset to idle from useToday already happened, so we surface a
      // locked snag toast here as a defensive UX cue.
      // (Cancel path beats us by setting sendPhase=idle synchronously, so we
      // don't double-toast on cancel — Sonner doesn't show duplicates of the
      // same custom node anyway.)
    }
  });
}

function SimpleToast({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-4 py-3 text-small text-ink shadow-md">
      {message}
    </div>
  );
}

interface PageBodyProps {
  status: TodayStatus;
  data: TodayBatch | null;
  retry: () => void;
  tier: string;
  autopilot: boolean;
  autopilotActive: boolean;
  markReady: (id: string) => Promise<void>;
  markSkipped: (id: string) => Promise<void>;
  markDefault: (id: string) => Promise<void>;
  editCard: (id: string, patch: TodayItemPatch) => Promise<TodayItem>;
  skipBatch: () => Promise<void>;
  applyTemplate: (templateId: string) => Promise<{
    rewritten: number;
    kept_edited: number;
    skipped_terminal: number;
  }>;
  onShowCheatsheet: () => void;
  onSendBatch: () => void;
}

function PageBody({
  status,
  data,
  retry,
  tier,
  autopilot,
  autopilotActive,
  markReady,
  markSkipped,
  markDefault,
  editCard,
  skipBatch,
  applyTemplate,
  onShowCheatsheet,
  onSendBatch,
}: PageBodyProps) {
  if (status === "loading") {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-3 px-gutter py-6 lg:px-8">
        <Skeleton className="h-48 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (status === "no-batch-yet") {
    return <TodayEmptyState variant="no-batch-yet" />;
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-gutter py-6 lg:px-8">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  if (status === "no-matches") {
    return (
      <TodayEmptyState
        variant="no-matches"
        onSkipToday={() => {
          void skipBatch().catch((err) => {
            if (err instanceof ApiError) {
              toast.error(err.message);
            } else {
              showSnagToast();
            }
          });
        }}
      />
    );
  }

  if (status === "limit-reached") {
    return (
      <TodayEmptyState
        variant={data.cap > 7 ? "limit-reached-paid" : "limit-reached-free"}
      />
    );
  }
  // Avoid lint: "tier" is consumed only for the no-matches fallback variant
  // (we route through batch.cap above). Touch it here so no unused warning.
  void tier;
  void retry;

  return (
    <PopulatedView
      data={data}
      autopilot={autopilot}
      autopilotActive={autopilotActive}
      markReady={markReady}
      markSkipped={markSkipped}
      markDefault={markDefault}
      editCard={editCard}
      applyTemplate={applyTemplate}
      onShowCheatsheet={onShowCheatsheet}
      onSendBatch={onSendBatch}
    />
  );
}

interface PopulatedViewProps {
  data: TodayBatch;
  autopilot: boolean;
  autopilotActive: boolean;
  markReady: (id: string) => Promise<void>;
  markSkipped: (id: string) => Promise<void>;
  markDefault: (id: string) => Promise<void>;
  editCard: (id: string, patch: TodayItemPatch) => Promise<TodayItem>;
  applyTemplate: (templateId: string) => Promise<{
    rewritten: number;
    kept_edited: number;
    skipped_terminal: number;
  }>;
  onShowCheatsheet: () => void;
  onSendBatch: () => void;
}

function PopulatedView({
  data,
  autopilot,
  autopilotActive,
  markReady,
  markSkipped,
  markDefault,
  editCard,
  applyTemplate,
  onShowCheatsheet,
  onSendBatch,
}: PopulatedViewProps) {
  const cardRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [activeId, setActiveId] = React.useState<string | null>(data.items[0]?.id ?? null);
  const [editorOpenId, setEditorOpenId] = React.useState<string | null>(null);

  // Accordion model: `activeId` is the EXPANDED row (full card); all others
  // render as compact CollapsedRows. Jumping (keyboard or click) expands the
  // target and scrolls it into view on the next paint.
  const onJump = React.useCallback((id: string) => {
    setActiveId(id);
    requestAnimationFrame(() => {
      cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  // Wrap mutation handlers with locked snag voice.
  const wrapWithSnag = React.useCallback(
    (fn: (id: string) => Promise<unknown>) => (id: string) => {
      void fn(id).catch(() => {
        showSnagToast();
      });
    },
    [],
  );

  const onMarkReady = React.useMemo(() => wrapWithSnag(markReady), [markReady, wrapWithSnag]);
  const onMarkSkipped = React.useMemo(() => wrapWithSnag(markSkipped), [markSkipped, wrapWithSnag]);
  const onMarkDefault = React.useMemo(() => wrapWithSnag(markDefault), [markDefault, wrapWithSnag]);

  const onAutopilotSkip = React.useCallback(
    (id: string) => {
      void markSkipped(id)
        .then(() => {
          toast("Skipped. We'll pick another.");
        })
        .catch(() => {
          showSnagToast();
        });
    },
    [markSkipped],
  );

  useTodayShortcuts({
    items: data.items,
    activeId,
    onFocusCard: onJump,
    onToggleReady: (id) => {
      const it = data.items.find((i) => i.id === id);
      if (!it) return;
      if (it.status === "ready") onMarkDefault(id);
      else onMarkReady(id);
    },
    onToggleSkipped: (id) => {
      const it = data.items.find((i) => i.id === id);
      if (!it) return;
      if (it.status === "skipped") onMarkDefault(id);
      else onMarkSkipped(id);
    },
    onOpenEditor: (id) => setEditorOpenId(id),
    onShowCheatsheet,
    onSendBatch,
    disabled: autopilot || editorOpenId !== null,
  });

  const selectedItem =
    data.items.find((i) => i.id === activeId) ?? data.items[0] ?? null;

  // Bottom-fade affordance on the roster column. Re-measures when the list
  // length changes (e.g. after applying a template that resurrects skipped
  // cards) so the fade goes away if the list now fits the viewport.
  const { ref: rosterRef, showBottomFade: showRosterFade } =
    useScrollFade<HTMLElement>([data.items.length]);

  const handleApplyTemplate = React.useCallback(
    async (templateId: string) => {
      const res = await applyTemplate(templateId);
      // Locked voice: tell the user exactly what changed.
      if (res.rewritten === 0 && res.kept_edited === 0) {
        toast("Nothing to rewrite — all cards are already sent or skipped.");
      } else if (res.kept_edited > 0) {
        toast(
          `Rewrote ${res.rewritten} ${res.rewritten === 1 ? "card" : "cards"} · ` +
            `${res.kept_edited} kept your edits.`,
        );
      } else {
        toast(`Rewrote ${res.rewritten} ${res.rewritten === 1 ? "card" : "cards"}.`);
      }
    },
    [applyTemplate],
  );

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-gutter py-6 lg:px-8">
      {/* Batch-level template picker. Hidden in autopilot mode (autopilot uses
          your templates as-is) and when the user has 0 saved templates (the
          picker self-hides). */}
      {!autopilot ? <BatchTemplatePicker onApply={handleApplyTemplate} /> : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {/* Roster — the "who". Tight, scannable; the message is the same template
            for everyone, so the recipient is what the user evaluates.

            The aside has its own scroll on lg+ so the reading pane stays put.
            With ~15 cards a desktop viewport only fits ~11; useScrollFade fades
            the last row out via mask-image so the user can tell there's more
            below. macOS hides the native scrollbar at rest, so without this
            hint the column reads as "only 11 cards" even when 15 are loaded. */}
        <aside
          ref={rosterRef}
          style={bottomFadeStyle(showRosterFade)}
          className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-[340px] lg:shrink-0 lg:overflow-y-auto"
        >
          {!autopilot ? <FirstBatchBanner /> : null}
          <div className="overflow-hidden rounded-md border border-line bg-paper">
            {data.items.map((item) => (
              <RosterRow
                key={item.id}
                item={item}
                selected={item.id === activeId}
                onSelect={onJump}
                onSkip={!autopilot ? onMarkSkipped : autopilotActive ? onAutopilotSkip : undefined}
                onUnskip={!autopilot ? onMarkDefault : undefined}
                rowRef={(el) => {
                  if (el) cardRefs.current.set(item.id, el);
                  else cardRefs.current.delete(item.id);
                }}
              />
            ))}
          </div>
        </aside>

        {/* Reading pane — the selected person's actual email + actions. */}
        <div className="min-w-0 flex-1">
          {selectedItem ? (
            <RecipientCard
              key={selectedItem.id}
              item={selectedItem}
              defaultExpanded
              editorOpen={editorOpenId === selectedItem.id}
              onEditorOpenChange={(open) => setEditorOpenId(open ? selectedItem.id : null)}
              autopilot={autopilot}
              onMarkReady={!autopilot ? onMarkReady : undefined}
              onMarkSkipped={!autopilot ? onMarkSkipped : undefined}
              onMarkDefault={!autopilot ? onMarkDefault : undefined}
              onEditCard={!autopilot ? editCard : undefined}
              onAutopilotSkip={autopilotActive ? onAutopilotSkip : undefined}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-b border-bordeaux/30 bg-bordeaux-tint px-gutter py-3 text-small text-bordeaux lg:px-8"
    >
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3">
        <span>We hit a snag loading today&apos;s batch. {message}</span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function FirstBatchBanner() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(FIRST_BATCH_KEY) !== "1") setShow(true);
    } catch {
      // ignore
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(FIRST_BATCH_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-ember-tint px-card py-3 text-small text-ink">
      <span>
        Your first batch. The first email is the hardest — we&apos;ll walk you through it.
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="text-flint underline-offset-4 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
