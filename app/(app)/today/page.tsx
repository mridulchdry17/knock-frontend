"use client";

import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { GmailDisconnectedBanner } from "@/components/gmail/gmail-disconnected-banner";
import { TodayHeader } from "@/components/knock/today-header";
import { AvatarStrip } from "@/components/knock/avatar-strip";
import { RecipientCard } from "@/components/knock/recipient-card";
import { TodayEmptyState } from "@/components/knock/today-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { useToday, type TodayStatus } from "@/lib/today/use-today";
import type { TodayBatch } from "@/lib/today/types";

const FIRST_BATCH_KEY = "knock.firstBatchSeen";

export default function TodayPage() {
  const { user } = useAuth();
  const { status, data, error, retry } = useToday();
  const cap = data?.cap ?? (user?.daily_limit ?? null);
  const sent = data?.sent_today ?? null;
  const tier = user?.tier ?? "free";

  // Mount the disconnected banner above content if user is connected=false. RouteGuard
  // already redirects approved+disconnected to /connect-gmail; this defensive mount
  // covers the rare in-session disconnect case so /today doesn't silently look healthy.
  const banner = user && user.gmail_connected === false ? <GmailDisconnectedBanner /> : null;

  return (
    <AppShell title="Today" banner={banner}>
      <TodayHeader cap={cap} sentToday={sent} loading={status === "loading"} />
      {status === "error" && error ? (
        <ErrorBanner message={error.message} onRetry={retry} />
      ) : null}
      <PageBody status={status} data={data} retry={retry} tier={tier} />
    </AppShell>
  );
}

function PageBody({
  status,
  data,
  retry,
  tier,
}: {
  status: TodayStatus;
  data: TodayBatch | null;
  retry: () => void;
  tier: string;
}) {
  // For client-only "Skip today" → flip into limit-reached locally per F.5a scope.
  const [skippedLocal, setSkippedLocal] = React.useState(false);

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
    // Banner above already shown; placeholder skeleton below keeps layout calm.
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-gutter py-6 lg:px-8">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  if (status === "no-matches") {
    if (skippedLocal) {
      return (
        <TodayEmptyState
          variant={tier === "paid" ? "limit-reached-paid" : "limit-reached-free"}
        />
      );
    }
    return <TodayEmptyState variant="no-matches" onSkipToday={() => setSkippedLocal(true)} />;
  }

  if (status === "limit-reached") {
    return (
      <TodayEmptyState
        variant={data.cap >= 20 ? "limit-reached-paid" : "limit-reached-free"}
      />
    );
  }

  // populated
  return <PopulatedView data={data} retry={retry} />;
}

function PopulatedView({ data, retry: _retry }: { data: TodayBatch; retry: () => void }) {
  void _retry;
  const cardRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [activeId, setActiveId] = React.useState<string | null>(data.items[0]?.id ?? null);

  const onJump = React.useCallback((id: string) => {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveId(id);
  }, []);

  // IntersectionObserver tracks which card is centered for AvatarStrip ring.
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible entry that's intersecting.
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

  return (
    <>
      <div className="sticky top-24 z-10 border-b border-line bg-paper/80 backdrop-blur">
        <AvatarStrip items={data.items} activeId={activeId} cap={data.cap} onJump={onJump} />
      </div>
      <div className="mx-auto flex max-w-[880px] flex-col gap-6 px-gutter py-6 lg:px-8">
        <FirstBatchBanner />
        {data.items.map((item) => (
          <RecipientCard
            key={item.id}
            item={item}
            cardRef={(el) => {
              if (el) cardRefs.current.set(item.id, el);
              else cardRefs.current.delete(item.id);
            }}
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
      // ignore — banner stays hidden if storage is unavailable
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
