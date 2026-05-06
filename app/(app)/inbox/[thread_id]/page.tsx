"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { ThreadDetail, ThreadDetailSkeleton } from "@/components/knock/thread-detail";
import { useInbox, useThread } from "@/lib/inbox/use-inbox";
import { ApiError } from "@/lib/api/errors";

/**
 * Mobile thread route. Topbar gets a back chevron via the `action` slot.
 * Desktop users hit this URL too (e.g. share-link), in which case it still
 * works as a single-pane view.
 */
export default function InboxThreadPage() {
  const params = useParams<{ thread_id: string }>();
  const router = useRouter();
  const threadId = params?.thread_id ?? null;
  const inbox = useInbox();
  const thread = useThread(threadId);

  // Mark read on first successful load.
  React.useEffect(() => {
    if (!threadId) return;
    if (thread.status !== "loaded") return;
    void inbox.mutations.markRead(threadId).catch(() => {});
  }, [threadId, thread.status, inbox.mutations]);

  const handleSendReply = async (bodyHtml: string) => {
    if (!threadId) {
      throw new ApiError(0, "no_thread", "No thread selected.");
    }
    return inbox.mutations.sendReply(threadId, bodyHtml);
  };

  const handleMarkDone = async () => {
    if (!threadId) return;
    await inbox.mutations.markDone(threadId);
    router.push("/inbox");
  };

  const back = (
    <button
      type="button"
      onClick={() => router.push("/inbox")}
      aria-label="Back to inbox"
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ChevronLeft size={18} aria-hidden />
    </button>
  );

  return (
    <AppShell title="Thread" action={back}>
      <div className="flex h-[calc(100vh-48px)] min-h-0 flex-col lg:h-[calc(100vh-56px)]">
        {!threadId ? (
          <ThreadDetailSkeleton />
        ) : thread.status === "loading" ? (
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-card text-center">
            <p className="text-body text-ink-2">
              {thread.error?.message ?? "We hit a snag loading this thread."}
            </p>
            <button
              type="button"
              onClick={() => {
                thread.refresh();
                toast.message("Retrying…");
              }}
              className="text-small font-medium text-flint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-card text-center">
            <p className="text-body text-ink-2">All caught up.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
