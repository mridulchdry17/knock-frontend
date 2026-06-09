import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isFixtureMode } from "@/lib/today/client";
import {
  fixtureUpdateCard,
  fixtureSendBatch,
  fixtureSkipToday,
} from "@/lib/today/fixtures";
import {
  TodayItemSchema,
  type TodayItem,
  type TodayItemPatch,
  BatchDispatchResultSchema,
  type BatchDispatchResult,
  SkipTodayResultSchema,
  type SkipTodayResult,
} from "@/lib/today/types";

/**
 * Per-card mutation. Forwards to PATCH /api/v1/today/items/{id}; returns the
 * updated TodayItem (Zod-parsed). All errors propagate as ApiError so callers
 * can render the locked error voice.
 */
export async function updateCard(
  itemId: string,
  patch: TodayItemPatch,
): Promise<TodayItem> {
  if (isFixtureMode()) {
    return fixtureUpdateCard(itemId, patch);
  }
  try {
    const raw = await apiFetch<unknown>(`/api/v1/today/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: patch,
    });
    return TodayItemSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag saving. Try again in a moment.");
  }
}

/**
 * Fire all `ready` cards in the current batch. Backend Phase 5 picks the cards
 * and dispatches; the v0 client supplies a 3-second hold via setTimeout in the
 * page layer (NOT here).
 *
 * v0.5+ swap point: the locked spec calls out a server-side Redis delay queue
 * + cancel endpoint (`/send-batch/cancel`). When that ships, the page layer
 * fires immediately and uses the cancel API instead of a local setTimeout.
 */
export async function sendBatch(): Promise<BatchDispatchResult> {
  if (isFixtureMode()) {
    return fixtureSendBatch();
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/today/send-batch", {
      method: "POST",
      body: {},
    });
    return BatchDispatchResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag sending. Try again in a moment.");
  }
}

/**
 * User explicitly skips entire batch for the day. Server flips all cards to
 * status='skipped'; UI transitions to limit-reached.
 */
export async function skipToday(): Promise<SkipTodayResult> {
  if (isFixtureMode()) {
    return fixtureSkipToday();
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/today/skip", {
      method: "POST",
      body: {},
    });
    return SkipTodayResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}
