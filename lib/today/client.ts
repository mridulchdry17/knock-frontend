import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { TodayBatchSchema, type TodayBatch } from "@/lib/today/types";
import { buildTodayFixture } from "@/lib/today/fixtures";

/**
 * Discriminated result for the /today read.
 *
 * - `batch`: backend returned a batch (caller decides limit-reached / no-matches
 *   from `data.items.length` and `data.sent_today >= data.cap`).
 * - `no-batch-yet`: 404 ({code:"no_batch_yet"}) OR 502 (proxy upstream
 *   unavailable). Both render the same calm "first batch matching" empty state.
 * - `error`: any other failure — caller renders the locked "We hit a snag" banner.
 */
export type TodayResult =
  | { kind: "batch"; data: TodayBatch }
  | { kind: "no-batch-yet" }
  | { kind: "error"; error: ApiError };

const FIXTURE_FLAG = "NEXT_PUBLIC_USE_TODAY_FIXTURES";

/** Whether the dev fixture mode is enabled. Inlined by Next at build time. */
export function isFixtureMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES === "true";
}

export async function fetchTodayBatch(): Promise<TodayResult> {
  if (isFixtureMode()) {
    return { kind: "batch", data: buildTodayFixture() };
  }

  try {
    const raw = await apiFetch<unknown>("/api/v1/today");
    const data = TodayBatchSchema.parse(raw);
    return { kind: "batch", data };
  } catch (err) {
    if (err instanceof ApiError) {
      // 404 with no_batch_yet OR 502 upstream_unavailable both => calm empty state.
      const noBatch =
        (err.status === 404 && err.code === "no_batch_yet") ||
        err.status === 502;
      if (noBatch) return { kind: "no-batch-yet" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading today's batch."),
    };
  }
}

export const __FIXTURE_FLAG = FIXTURE_FLAG;
