"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import {
  fetchInboxList,
  fetchSyncStatus,
  fetchThread as apiFetchThread,
  markThreadDone as apiMarkDone,
  markThreadRead as apiMarkRead,
  sendReply as apiSendReply,
} from "@/lib/inbox/client";
import type {
  InboxItem,
  InboxList,
  InboxTab,
  ReplyResult,
  SyncStatus,
  ThreadDetail,
  ThreadDetailResult,
  ThreadMessage,
} from "@/lib/inbox/types";

/**
 * Top-level UI status for /inbox list.
 *
 *  - loading      first paint, no data yet
 *  - empty        200 with items=[] OR 502 unavailable — same calm "All caught up." per spec
 *  - populated    items present
 *  - error        any other 4xx/5xx
 */
export type InboxStatus = "loading" | "empty" | "populated" | "error";

export interface InboxMutations {
  markRead: (id: string) => Promise<void>;
  sendReply: (id: string, bodyHtml: string, subject?: string) => Promise<ReplyResult>;
  markDone: (id: string) => Promise<void>;
}

export interface UseInboxResult {
  status: InboxStatus;
  items: InboxItem[];
  total: number;
  unreadCount: number;
  syncHealthy: boolean;
  lastSyncedAt: string | null;
  error: ApiError | null;
  /** Currently active tab. Default "replies" per spec. */
  tab: InboxTab;
  setTab: (tab: InboxTab) => void;
  refresh: () => void;
  mutations: InboxMutations;
}

const DEFAULT_TAB: InboxTab = "replies";

export function useInbox(): UseInboxResult {
  const [tab, setTabState] = useState<InboxTab>(DEFAULT_TAB);
  const [status, setStatus] = useState<InboxStatus>("loading");
  const [list, setList] = useState<InboxList>({
    items: [],
    total: 0,
    unread_count: 0,
  });
  const [sync, setSync] = useState<SyncStatus>({ healthy: true, last_synced_at: null });
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const listRef = useRef<InboxList>(list);
  listRef.current = list;

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  const setTab = useCallback((next: InboxTab) => setTabState(next), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    Promise.all([fetchInboxList(tab), fetchSyncStatus()])
      .then(([res, syncRes]) => {
        if (cancelled) return;
        setSync(syncRes);
        if (res.kind === "unavailable") {
          setList({ items: [], total: 0, unread_count: 0 });
          setStatus("empty");
          return;
        }
        if (res.kind === "error") {
          setError(res.error);
          setStatus("error");
          return;
        }
        setList(res.data);
        setStatus(res.data.items.length === 0 ? "empty" : "populated");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown", "We hit a snag loading inbox."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const setListBoth = useCallback((next: InboxList) => {
    listRef.current = next;
    setList(next);
    setStatus(next.items.length === 0 ? "empty" : "populated");
  }, []);

  const markRead = useCallback(
    async (id: string): Promise<void> => {
      const snapshot = listRef.current;
      const idx = snapshot.items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const wasUnread = snapshot.items[idx].unread;
      if (!wasUnread) return; // idempotent — skip
      const items = snapshot.items.slice();
      items[idx] = { ...items[idx], unread: false };
      setListBoth({
        ...snapshot,
        items,
        unread_count: Math.max(0, snapshot.unread_count - 1),
      });
      try {
        await apiMarkRead(id);
      } catch (err) {
        // Non-fatal — the read receipt is best-effort. Roll back so the
        // unread dot reappears and the user can retry by re-opening.
        setListBoth(snapshot);
        if (err instanceof ApiError) throw err;
        throw new ApiError(0, "unknown", "We hit a snag.");
      }
    },
    [setListBoth],
  );

  const sendReply = useCallback(
    async (id: string, bodyHtml: string, subject?: string): Promise<ReplyResult> => {
      // No optimistic mutation on the list level (snippet update is small).
      // Optimistic *append* of the outbound message is owned by the
      // ThreadDetail component since it holds the message array.
      try {
        return await apiSendReply(id, bodyHtml, subject);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          0,
          "unknown",
          "We hit a snag sending. Your draft is saved — try again or skip for today.",
        );
      }
    },
    [],
  );

  const markDone = useCallback(
    async (id: string): Promise<void> => {
      const snapshot = listRef.current;
      const idx = snapshot.items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const removed = snapshot.items[idx];
      const next = snapshot.items.filter((i) => i.id !== id);
      setListBoth({
        items: next,
        total: Math.max(0, snapshot.total - 1),
        unread_count: removed.unread
          ? Math.max(0, snapshot.unread_count - 1)
          : snapshot.unread_count,
      });
      try {
        await apiMarkDone(id);
      } catch (err) {
        setListBoth(snapshot);
        if (err instanceof ApiError) throw err;
        throw new ApiError(0, "unknown", "We hit a snag.");
      }
    },
    [setListBoth],
  );

  return {
    status,
    items: list.items,
    total: list.total,
    unreadCount: list.unread_count,
    syncHealthy: sync.healthy,
    lastSyncedAt: sync.last_synced_at,
    error,
    tab,
    setTab,
    refresh,
    mutations: { markRead, sendReply, markDone },
  };
}

/* -------------------------------------------------------------------------- */
/* Single-thread loader hook                                                  */
/* -------------------------------------------------------------------------- */

export type ThreadStatus = "loading" | "loaded" | "unavailable" | "error";

export interface UseThreadResult {
  status: ThreadStatus;
  thread: ThreadDetail | null;
  error: ApiError | null;
  refresh: () => void;
  /** Optimistically append an outbound message (used by ReplyComposer). */
  appendOptimistic: (msg: ThreadMessage) => void;
  /** Roll back the most recent optimistic append. */
  rollbackOptimistic: (messageId: string) => void;
}

export function useThread(threadId: string | null): UseThreadResult {
  const [status, setStatus] = useState<ThreadStatus>(threadId ? "loading" : "loaded");
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const threadRef = useRef<ThreadDetail | null>(null);
  threadRef.current = thread;

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!threadId) {
      setThread(null);
      setStatus("loaded");
      setError(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    apiFetchThread(threadId)
      .then((res: ThreadDetailResult) => {
        if (cancelled) return;
        if (res.kind === "thread") {
          setThread(res.data);
          setStatus("loaded");
        } else if (res.kind === "unavailable") {
          setThread(null);
          setStatus("unavailable");
        } else {
          setError(res.error);
          setStatus("error");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown", "We hit a snag loading this thread."),
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, reloadKey]);

  const appendOptimistic = useCallback((msg: ThreadMessage) => {
    const cur = threadRef.current;
    if (!cur) return;
    const next: ThreadDetail = { ...cur, messages: [...cur.messages, msg] };
    threadRef.current = next;
    setThread(next);
  }, []);

  const rollbackOptimistic = useCallback((messageId: string) => {
    const cur = threadRef.current;
    if (!cur) return;
    const next: ThreadDetail = {
      ...cur,
      messages: cur.messages.filter((m) => m.id !== messageId),
    };
    threadRef.current = next;
    setThread(next);
  }, []);

  return { status, thread, error, refresh, appendOptimistic, rollbackOptimistic };
}
