"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTodayBatch } from "@/lib/today/client";
import {
  updateCard as apiUpdateCard,
  sendBatch as apiSendBatch,
  skipToday as apiSkipToday,
  applyTemplateToBatch as apiApplyTemplate,
} from "@/lib/today/mutations";
import type {
  TodayBatch,
  TodayItem,
  TodayItemPatch,
  BatchDispatchResult,
  ApplyTemplateResult,
} from "@/lib/today/types";
import { ApiError } from "@/lib/api/errors";

/**
 * Top-level UI state for /today.
 *
 *  - loading        first paint, no data yet
 *  - no-batch-yet   pre-cron / backend not built / upstream 502
 *  - no-matches     200 with `items: []`
 *  - limit-reached  `sent_today >= cap` (and items present)
 *  - populated      cards to render
 *  - error          any other 4xx/5xx
 */
export type TodayStatus =
  | "loading"
  | "no-batch-yet"
  | "no-matches"
  | "limit-reached"
  | "populated"
  | "error";

/**
 * Send-batch flow phases. Drives the toast + button states.
 *
 *  - idle         no send in flight
 *  - holding      3-second client-side hold before firing API; user can undo
 *  - dispatching  hold ended, awaiting API response
 *  - dispatched   API returned ok; cards are queued in the staggered schedule.
 *                 (No optimistic ready→sent flip — actual sending is server-
 *                 side and happens as each send_time arrives.)
 */
export type SendPhase = "idle" | "holding" | "dispatching" | "dispatched";

export interface UseTodayResult {
  status: TodayStatus;
  data: TodayBatch | null;
  error: ApiError | null;
  retry: () => void;
  /** Count of cards in `ready` status. Convenience for the header button. */
  readyCount: number;
  /** Optimistic mutations. Each rolls back on failure and surfaces an ApiError via the returned promise. */
  markReady: (itemId: string) => Promise<void>;
  markSkipped: (itemId: string) => Promise<void>;
  markDefault: (itemId: string) => Promise<void>;
  editCard: (itemId: string, patch: TodayItemPatch) => Promise<TodayItem>;
  /** Mark every default-state card as ready (header convenience). */
  markAllReady: () => Promise<void>;
  /** Initiate the 3-second hold + send flow. Resolves to undo handle. */
  beginSend: () => SendHandle | null;
  sendPhase: SendPhase;
  /** Result of the most recent send (after API completes). */
  sendResult: BatchDispatchResult | null;
  /** Skip the entire batch for today. */
  skipBatch: () => Promise<void>;
  /**
   * Apply a template to every pristine (un-edited, non-terminal) card in
   * today's batch. Returns counts so the caller can show a result toast.
   * Refetches on success so the new subject/body land in the UI.
   */
  applyTemplate: (templateId: string) => Promise<ApplyTemplateResult>;
}

/** Returned from beginSend; lets the caller cancel the 3s hold. */
export interface SendHandle {
  /** Cancel the pending dispatch (only valid during 'holding'). */
  cancel: () => void;
  /**
   * Resolves once the dispatch resolves (success or failure). Caller can await
   * for "all done — clean up toast" behavior, but must NOT block UI on it.
   */
  done: Promise<BatchDispatchResult | null>;
}

function deriveStatus(batch: TodayBatch): "no-matches" | "limit-reached" | "populated" {
  if (batch.items.length === 0) return "no-matches";
  if (batch.sent_today >= batch.cap) return "limit-reached";
  return "populated";
}

export function useToday(): UseTodayResult {
  const [status, setStatus] = useState<TodayStatus>("loading");
  const [data, setData] = useState<TodayBatch | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sendPhase, setSendPhase] = useState<SendPhase>("idle");
  const [sendResult, setSendResult] = useState<BatchDispatchResult | null>(null);

  // Refs so the send-flow setTimeout has access to live data without recreating the timer.
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef<boolean>(false);
  // Live-data ref so mutation handlers can capture a true pre-mutation snapshot
  // without racing the React setState batcher.
  const dataRef = useRef<TodayBatch | null>(null);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetchTodayBatch()
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "no-batch-yet") {
          setData(null);
          setStatus("no-batch-yet");
          return;
        }
        if (result.kind === "error") {
          setError(result.error);
          setStatus("error");
          return;
        }
        dataRef.current = result.data;
        setData(result.data);
        setStatus(deriveStatus(result.data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown", "We hit a snag loading today's batch."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /** Apply a partial mutation to a single item; returns a snapshot of the prior item for rollback. */
  const patchItemLocal = useCallback(
    (itemId: string, partial: Partial<TodayItem>): TodayItem | null => {
      const cur = dataRef.current;
      if (!cur) return null;
      const idx = cur.items.findIndex((i) => i.id === itemId);
      if (idx < 0) return null;
      const snapshot = cur.items[idx];
      const nextItems = cur.items.slice();
      nextItems[idx] = { ...nextItems[idx], ...partial };
      const nextBatch = { ...cur, items: nextItems };
      dataRef.current = nextBatch;
      setData(nextBatch);
      setStatus(deriveStatus(nextBatch));
      return snapshot;
    },
    [],
  );

  const restoreItem = useCallback((itemId: string, prior: TodayItem | null) => {
    if (!prior) return;
    const cur = dataRef.current;
    if (!cur) return;
    const idx = cur.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const nextItems = cur.items.slice();
    nextItems[idx] = prior;
    const nextBatch = { ...cur, items: nextItems };
    dataRef.current = nextBatch;
    setData(nextBatch);
    setStatus(deriveStatus(nextBatch));
  }, []);

  const runStatusMutation = useCallback(
    async (itemId: string, nextStatus: TodayItem["status"]) => {
      const snap = patchItemLocal(itemId, { status: nextStatus });
      try {
        await apiUpdateCard(itemId, { status: nextStatus });
      } catch (err) {
        restoreItem(itemId, snap);
        throw err;
      }
    },
    [patchItemLocal, restoreItem],
  );

  const markReady = useCallback(
    (id: string) => runStatusMutation(id, "ready"),
    [runStatusMutation],
  );
  const markSkipped = useCallback(
    (id: string) => runStatusMutation(id, "skipped"),
    [runStatusMutation],
  );
  const markDefault = useCallback(
    (id: string) => runStatusMutation(id, "default"),
    [runStatusMutation],
  );

  const editCard = useCallback(
    async (itemId: string, patch: TodayItemPatch): Promise<TodayItem> => {
      // Per spec: any inline edit auto-marks ready.
      const merged: TodayItemPatch = { ...patch };
      if (merged.status === undefined) merged.status = "ready";
      const snap = patchItemLocal(itemId, {
        ...(merged.subject !== undefined ? { subject: merged.subject } : {}),
        ...(merged.body !== undefined
          ? { body: merged.body, body_preview: merged.body.slice(0, 200) }
          : {}),
        ...(merged.send_time !== undefined ? { send_time: merged.send_time } : {}),
        ...(merged.template_id !== undefined ? { template_id: merged.template_id } : {}),
        status: merged.status,
      });
      try {
        const updated = await apiUpdateCard(itemId, merged);
        // Replace with server canonical version.
        const cur = dataRef.current;
        if (cur) {
          const idx = cur.items.findIndex((i) => i.id === itemId);
          if (idx >= 0) {
            const nextItems = cur.items.slice();
            nextItems[idx] = updated;
            const nextBatch = { ...cur, items: nextItems };
            dataRef.current = nextBatch;
            setData(nextBatch);
          }
        }
        return updated;
      } catch (err) {
        restoreItem(itemId, snap);
        throw err;
      }
    },
    [patchItemLocal, restoreItem],
  );

  const markAllReady = useCallback(async () => {
    const cur = data;
    if (!cur) return;
    const targets = cur.items.filter((i) => i.status === "default");
    await Promise.all(
      targets.map((t) =>
        runStatusMutation(t.id, "ready").catch(() => {
          // Individual failures bubble up via toast at call site for the bulk action;
          // here we swallow to avoid Promise.all's all-or-nothing behavior.
        }),
      ),
    );
  }, [data, runStatusMutation]);

  /**
   * Begin the send-batch flow with a 3-second client-side hold.
   *
   * Phase transitions: idle → holding → (cancel? idle) → dispatching → dispatched|idle.
   *
   * v0.5+ swap point: replace the local setTimeout + cancel ref pair with a
   * server-side queue token + cancel API call.
   */
  const beginSend = useCallback((): SendHandle | null => {
    if (!data) return null;
    const ready = data.items.filter((i) => i.status === "ready");
    if (ready.length === 0) return null;
    cancelledRef.current = false;
    setSendPhase("holding");

    let resolveDone: (v: BatchDispatchResult | null) => void = () => {};
    const done = new Promise<BatchDispatchResult | null>((resolve) => {
      resolveDone = resolve;
    });

    sendTimerRef.current = setTimeout(() => {
      if (cancelledRef.current) return;
      setSendPhase("dispatching");
      apiSendBatch()
        .then((res) => {
          setSendResult(res);
          // Backend response semantics: `dispatched_count` is the number of
          // cards we APPROVED (queued at the back of the staggered schedule),
          // NOT the number actually delivered. Sends happen as each card's
          // send_time arrives. So we don't optimistically flip ready→sent and
          // we don't bump sent_today — the next /today GET (after a real send
          // fires) will reflect the truth.
          setSendPhase("dispatched");
          resolveDone(res);
        })
        .catch(() => {
          // Failure: cards stay in ready state (no optimistic transition was done yet).
          setSendPhase("idle");
          resolveDone(null);
        });
    }, 3000);

    return {
      cancel: () => {
        if (cancelledRef.current) return;
        cancelledRef.current = true;
        if (sendTimerRef.current) {
          clearTimeout(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        setSendPhase("idle");
        resolveDone(null);
      },
      done,
    };
  }, [data]);

  // Reset sendPhase back to idle after a moment of "dispatched" so subsequent sends work.
  useEffect(() => {
    if (sendPhase !== "dispatched") return;
    const t = setTimeout(() => setSendPhase("idle"), 1500);
    return () => clearTimeout(t);
  }, [sendPhase]);

  // Cleanup any pending send-timer on unmount.
  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, []);

  const skipBatch = useCallback(async () => {
    await apiSkipToday();
    // After skip: backend has flipped all cards to skipped; UI transitions to limit-reached.
    const cur = dataRef.current;
    if (cur) {
      const nextItems = cur.items.map((i) =>
        i.status === "sent" ? i : { ...i, status: "skipped" as const },
      );
      const nextBatch = { ...cur, items: nextItems, sent_today: cur.cap };
      dataRef.current = nextBatch;
      setData(nextBatch);
      setStatus("limit-reached");
    }
  }, []);

  const applyTemplate = useCallback(
    async (templateId: string): Promise<ApplyTemplateResult> => {
      const res = await apiApplyTemplate(templateId);
      // Refetch — every pristine card's subject/body changed server-side.
      setReloadKey((k) => k + 1);
      return res;
    },
    [],
  );

  const readyCount = data
    ? data.items.filter((i) => i.status === "ready").length
    : 0;

  return {
    status,
    data,
    error,
    retry,
    readyCount,
    markReady,
    markSkipped,
    markDefault,
    editCard,
    markAllReady,
    beginSend,
    sendPhase,
    sendResult,
    skipBatch,
    applyTemplate,
  };
}
