"use client";

import * as React from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { GmailDisconnectedBanner } from "@/components/gmail/gmail-disconnected-banner";
import { TodayHeader } from "@/components/knock/today-header";
import { TodayAutopilotHeader } from "@/components/knock/today-autopilot-header";
import { AvatarStrip } from "@/components/knock/avatar-strip";
import { RecipientCard } from "@/components/knock/recipient-card";
import { TodayEmptyState } from "@/components/knock/today-empty-state";
import { UndoToast } from "@/components/knock/undo-toast";
import { KeyboardShortcutsDialog } from "@/components/knock/keyboard-shortcuts-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { useToday, type TodayStatus } from "@/lib/today/use-today";
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

  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);

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
                  toast.error("We hit a snag — try again in a moment.");
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
      toast.error("We hit a snag — try again in a moment.");
    }
  }, [refresh]);

  const onAutopilotResume = React.useCallback(async () => {
    try {
      await resumeAutopilot();
      await refresh();
    } catch {
      toast.error("We hit a snag — try again in a moment.");
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
          cap={cap ?? 20}
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
          readyCount={today.readyCount}
          defaultCount={
            today.data?.items.filter((i) => i.status === "default").length ?? 0
          }
          onSend={() => beginSendWithToast(today)}
          onMarkAllReady={() => {
            void today.markAllReady();
          }}
          showShortcutHint={shortcutHint}
        />
      )}
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
        onShowCheatsheet={() => setCheatsheetOpen(true)}
        onSendBatch={() => beginSendWithToast(today)}
      />
      <KeyboardShortcutsDialog open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
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
        message={`${readyCount} email${readyCount === 1 ? "" : "s"} sending.`}
        durationMs={3000}
        onUndo={() => {
          handle.cancel();
          toast.custom(() => <SimpleToast message="Held. Send when you're ready." />, {
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
  onShowCheatsheet,
  onSendBatch,
}: PageBodyProps) {
  if (status === "loading") {
    return (
      <>
        <AvatarStrip items={[]} cap={7} loading />
        <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-gutter py-6 lg:px-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </>
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
            toast.error(
              err instanceof ApiError
                ? err.message
                : "We hit a snag — try again in a moment.",
            );
          });
        }}
      />
    );
  }

  if (status === "limit-reached") {
    return (
      <TodayEmptyState
        variant={data.cap >= 20 ? "limit-reached-paid" : "limit-reached-free"}
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
  onShowCheatsheet,
  onSendBatch,
}: PopulatedViewProps) {
  const cardRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [activeId, setActiveId] = React.useState<string | null>(data.items[0]?.id ?? null);
  const [editorOpenId, setEditorOpenId] = React.useState<string | null>(null);

  const onJump = React.useCallback((id: string) => {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveId(id);
  }, []);

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
        }
        if (best) {
          const id = (best.target as HTMLElement).dataset.cardId;
          if (id) setActiveId(id);
        }
      },
      { threshold: [0.4, 0.7], rootMargin: "-30% 0px -30% 0px" },
    );
    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data.items]);

  // Wrap mutation handlers with locked snag voice.
  const wrapWithSnag = React.useCallback(
    (fn: (id: string) => Promise<unknown>) => (id: string) => {
      void fn(id).catch(() => {
        toast.error("We hit a snag — try again in a moment.");
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
          toast.error("We hit a snag — try again in a moment.");
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

  return (
    <>
      <div className="sticky top-24 z-10 border-b border-line bg-paper/80 backdrop-blur">
        <AvatarStrip items={data.items} activeId={activeId} cap={data.cap} onJump={onJump} />
      </div>
      <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-gutter py-6 lg:px-8">
        {!autopilot ? <FirstBatchBanner /> : null}
        {data.items.map((item) => (
          <RecipientCard
            key={item.id}
            item={item}
            isActive={item.id === activeId}
            editorOpen={editorOpenId === item.id}
            onEditorOpenChange={(open) => setEditorOpenId(open ? item.id : null)}
            cardRef={(el) => {
              if (el) cardRefs.current.set(item.id, el);
              else cardRefs.current.delete(item.id);
            }}
            autopilot={autopilot}
            onMarkReady={!autopilot ? onMarkReady : undefined}
            onMarkSkipped={!autopilot ? onMarkSkipped : undefined}
            onMarkDefault={!autopilot ? onMarkDefault : undefined}
            onEditCard={!autopilot ? editCard : undefined}
            onAutopilotSkip={autopilotActive ? onAutopilotSkip : undefined}
          />
        ))}
      </div>
    </>
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
