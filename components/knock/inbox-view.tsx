"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/knock/empty-state";
import { KeyboardHint } from "@/components/knock/keyboard-hint";
import { KeyboardShortcutsDialog } from "@/components/knock/keyboard-shortcuts-dialog";
import { InboxList } from "@/components/knock/inbox-list";
import { ThreadDetail, ThreadDetailSkeleton } from "@/components/knock/thread-detail";
import { useInbox, useThread } from "@/lib/inbox/use-inbox";
import { useInboxShortcuts } from "@/lib/inbox/use-inbox-shortcuts";
import { ApiError } from "@/lib/api/errors";

const NO_THREAD_TITLE = "Pick a message on the left.";

/**
 * Top-level /inbox composition.
 *
 * Desktop (≥1024px): two-pane — list 360px, detail flex-1.
 * Mobile (<1024px):  list-only; row tap navigates to /inbox/[thread_id].
 *
 * Selection state lives here so J/K shortcuts can drive both panes.
 */
export function InboxView() {
  const router = useRouter();
  const inbox = useInbox();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = React.useState(false);

  const isMobile = useIsMobile();

  // Auto-select first thread on desktop once data arrives.
  React.useEffect(() => {
    if (isMobile) return;
    if (selectedId) return;
    if (inbox.status === "populated" && inbox.items.length > 0) {
      setSelectedId(inbox.items[0].id);
    }
  }, [isMobile, inbox.status, inbox.items, selectedId]);

  // If the currently-selected row drops out of the list (e.g., switched tab,
  // or marked-done), pick the first remaining or clear selection.
  React.useEffect(() => {
    if (!selectedId) return;
    if (inbox.items.find((i) => i.id === selectedId)) return;
    setSelectedId(inbox.items[0]?.id ?? null);
  }, [inbox.items, selectedId]);

  const thread = useThread(isMobile ? null : selectedId);

  // Mark read on open (desktop). Mobile mark-read happens on the route page.
  React.useEffect(() => {
    if (isMobile || !selectedId) return;
    if (thread.status !== "loaded") return;
    void inbox.mutations.markRead(selectedId).catch(() => {
      // Best-effort; rollback handled inside the hook.
    });
  }, [isMobile, selectedId, thread.status, inbox.mutations]);

  const onSelect = React.useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const onOpen = React.useCallback(
    (id: string) => {
      if (isMobile) {
        router.push(`/inbox/${encodeURIComponent(id)}`);
      } else {
        setSelectedId(id);
      }
    },
    [isMobile, router],
  );

  useInboxShortcuts({
    items: inbox.items,
    selectedId,
    onSelect,
    onOpen,
    onEscape: () => setSelectedId(null),
    onShowCheatsheet: () => setCheatsheetOpen(true),
    disabled: isMobile,
  });

  const handleSendReply = async (bodyHtml: string) => {
    if (!selectedId) {
      throw new ApiError(0, "no_thread", "No thread selected.");
    }
    return inbox.mutations.sendReply(selectedId, bodyHtml);
  };

  const handleMarkDone = async () => {
    if (!selectedId) return;
    const id = selectedId;
    await inbox.mutations.markDone(id);
    setSelectedId(null);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <InboxList
        status={inbox.status}
        items={inbox.items}
        unreadCount={inbox.unreadCount}
        tab={inbox.tab}
        onTabChange={inbox.setTab}
        selectedId={selectedId}
        onSelect={onOpen}
        syncHealthy={inbox.syncHealthy}
        onSyncRetry={inbox.refresh}
        onErrorRetry={inbox.refresh}
        errorMessage={inbox.error?.message}
        variant={isMobile ? "mobile" : "desktop"}
      />

      {/* Desktop right pane */}
      {!isMobile ? (
        <div
          className="hidden min-h-0 flex-1 flex-col lg:flex"
          aria-label="Thread detail"
        >
          {selectedId ? (
            thread.status === "loading" ? (
              <ThreadDetailSkeleton />
            ) : thread.status === "loaded" && thread.thread ? (
              <ThreadDetail
                thread={thread.thread}
                onSendReply={handleSendReply}
                onMarkDone={handleMarkDone}
                appendOptimistic={thread.appendOptimistic}
                rollbackOptimistic={thread.rollbackOptimistic}
              />
            ) : thread.status === "error" ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-card text-center">
                <p className="text-body text-ink-2">
                  {thread.error?.message ?? "We hit a snag loading this thread."}
                </p>
                <button
                  type="button"
                  onClick={thread.refresh}
                  className="text-small font-medium text-flint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
                >
                  Retry
                </button>
              </div>
            ) : (
              <NoThreadEmpty />
            )
          ) : (
            <NoThreadEmpty />
          )}
        </div>
      ) : null}

      <KeyboardShortcutsDialog
        open={cheatsheetOpen}
        onOpenChange={setCheatsheetOpen}
      />
    </div>
  );
}

function NoThreadEmpty() {
  return (
    <EmptyState
      title={NO_THREAD_TITLE}
      body={
        <span className="inline-flex items-center gap-2">
          <KeyboardHint>J</KeyboardHint>
          <span className="text-ink-3">/</span>
          <KeyboardHint>K</KeyboardHint>
          <span>to navigate</span>
        </span>
      }
    />
  );
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isMobile;
}
