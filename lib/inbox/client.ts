import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  InboxListSchema,
  ReplyResultSchema,
  SyncStatusSchema,
  ThreadDetailSchema,
  type InboxList,
  type InboxListResult,
  type InboxTab,
  type ReplyResult,
  type SyncStatus,
  type ThreadDetail,
  type ThreadDetailResult,
} from "@/lib/inbox/types";
import { TAB_TO_CATEGORY } from "@/lib/inbox/types";
import {
  fixtureList,
  fixtureMarkDone,
  fixtureMarkRead,
  fixtureReply,
  fixtureSyncStatus,
  fixtureThread,
} from "@/lib/inbox/fixtures";

/**
 * F.7 reuses F.5a's flag (`NEXT_PUBLIC_USE_TODAY_FIXTURES`). One knob across
 * /today, /templates, /inbox keeps local dev state coherent.
 */
export function isFixtureMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES === "true";
}

function tabQuery(tab: InboxTab): string {
  const cat = TAB_TO_CATEGORY[tab];
  return cat ? `?category=${cat}` : "";
}

export async function fetchInboxList(tab: InboxTab): Promise<InboxListResult> {
  if (isFixtureMode()) {
    return { kind: "list", data: fixtureList(tab) };
  }
  try {
    const raw = await apiFetch<unknown>(`/api/v1/inbox${tabQuery(tab)}`);
    const data = InboxListSchema.parse(raw);
    return { kind: "list", data };
  } catch (err) {
    if (err instanceof ApiError) {
      // 502 from proxy = backend Phase 5 not ready yet → calm "All caught up."
      if (err.status === 502) return { kind: "unavailable" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading inbox."),
    };
  }
}

export async function fetchThread(id: string): Promise<ThreadDetailResult> {
  if (isFixtureMode()) {
    try {
      return { kind: "thread", data: fixtureThread(id) };
    } catch (err) {
      if (err instanceof ApiError) return { kind: "error", error: err };
      throw err;
    }
  }
  try {
    const raw = await apiFetch<unknown>(`/api/v1/inbox/${encodeURIComponent(id)}`);
    const data = ThreadDetailSchema.parse(raw);
    return { kind: "thread", data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 502) return { kind: "unavailable" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading this thread."),
    };
  }
}

export async function markThreadRead(id: string): Promise<void> {
  if (isFixtureMode()) {
    fixtureMarkRead(id);
    return;
  }
  try {
    await apiFetch<unknown>(`/api/v1/inbox/${encodeURIComponent(id)}/read`, {
      method: "POST",
      body: {},
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag.");
  }
}

export async function sendReply(
  id: string,
  body_html: string,
  subject?: string,
): Promise<ReplyResult> {
  if (isFixtureMode()) {
    return fixtureReply(id, body_html);
  }
  try {
    const raw = await apiFetch<unknown>(
      `/api/v1/inbox/${encodeURIComponent(id)}/reply`,
      {
        method: "POST",
        body: subject ? { subject, body_html } : { body_html },
      },
    );
    return ReplyResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      0,
      "unknown",
      "We hit a snag sending. Your draft is saved — try again or skip for today.",
    );
  }
}

export async function markThreadDone(id: string): Promise<void> {
  if (isFixtureMode()) {
    fixtureMarkDone(id);
    return;
  }
  try {
    await apiFetch<unknown>(`/api/v1/inbox/${encodeURIComponent(id)}/done`, {
      method: "POST",
      body: {},
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag.");
  }
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  if (isFixtureMode()) {
    return fixtureSyncStatus();
  }
  try {
    const raw = await apiFetch<unknown>(`/api/v1/inbox/sync-status`);
    return SyncStatusSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError && err.status === 502) {
      // No sync info → present as unhealthy with no last_synced_at so the UI
      // banner appears (graceful: tells the user state isn't fresh).
      return { healthy: false, last_synced_at: null };
    }
    // Any other error: assume healthy (don't false-alarm the user).
    return { healthy: true, last_synced_at: null };
  }
}

// Re-export types as a convenience for callers.
export type {
  InboxList,
  InboxListResult,
  ReplyResult,
  SyncStatus,
  ThreadDetail,
  ThreadDetailResult,
};
