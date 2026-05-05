"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTodayBatch } from "@/lib/today/client";
import type { TodayBatch } from "@/lib/today/types";
import { ApiError } from "@/lib/api/errors";

/**
 * Top-level UI state for /today. Page picks one of these and renders.
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

export interface UseTodayResult {
  status: TodayStatus;
  data: TodayBatch | null;
  error: ApiError | null;
  retry: () => void;
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

  return { status, data, error, retry };
}
