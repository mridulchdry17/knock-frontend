"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { OnboardingStatusSchema, type OnboardingStatus } from "@/lib/auth/types";

/**
 * Polls /api/v1/onboarding/status while the tab is visible. State machine:
 *
 *   active   — 60s interval, default. Up to 3 consecutive failures.
 *   backoff  — 5min interval, after 3 fails. Up to 12 more fails (~1hr).
 *   stopped  — hard stop. Show "refresh page" prompt.
 *
 * Visibility-aware: pauses on document.hidden, resumes on visibilitychange.
 * Manual `refresh()` re-polls immediately and resets the failure streak on success.
 *
 * The hook fires `onApproved` exactly once when tier flips from `pending` to
 * any non-pending tier (free / paid / super_admin).
 *
 * Pure timer + reducer — no router/toast coupling — so the consumer wires those.
 */

export type PollMode = "active" | "backoff" | "stopped";

export interface UseApprovalPollOptions {
  /** Called once when tier transitions from "pending" to non-pending. */
  onApproved?: (status: OnboardingStatus) => void;
  /** Override intervals for tests (ms). */
  activeIntervalMs?: number;
  backoffIntervalMs?: number;
  /** Override failure thresholds for tests. */
  failsBeforeBackoff?: number;
  failsBeforeStop?: number;
}

export interface UseApprovalPollResult {
  status: OnboardingStatus | null;
  mode: PollMode;
  /** True while a request is in flight. */
  loading: boolean;
  /** Last error from the most recent failed poll. Cleared on success. */
  error: Error | null;
  /** Force an immediate poll. Resets fail streak on success. */
  refresh: () => Promise<void>;
}

const DEFAULTS = {
  activeIntervalMs: 60_000,
  backoffIntervalMs: 5 * 60_000,
  failsBeforeBackoff: 3,
  failsBeforeStop: 12,
};

export function useApprovalPoll(options: UseApprovalPollOptions = {}): UseApprovalPollResult {
  const {
    onApproved,
    activeIntervalMs = DEFAULTS.activeIntervalMs,
    backoffIntervalMs = DEFAULTS.backoffIntervalMs,
    failsBeforeBackoff = DEFAULTS.failsBeforeBackoff,
    failsBeforeStop = DEFAULTS.failsBeforeStop,
  } = options;

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [mode, setMode] = useState<PollMode>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs hold the parts the timer loop reads — avoids restarting on every state change.
  const failsRef = useRef(0);
  const modeRef = useRef<PollMode>("active");
  const approvedFiredRef = useRef(false);
  const lastTierRef = useRef<string | null>(null);
  const onApprovedRef = useRef(onApproved);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);

  const setModeBoth = useCallback((next: PollMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const tick = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    if (modeRef.current === "stopped") return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const data = await apiFetch<unknown>("/api/v1/onboarding/status");
      const parsed = OnboardingStatusSchema.parse(data);
      failsRef.current = 0;
      setError(null);
      setStatus(parsed);
      if (modeRef.current === "backoff") setModeBoth("active");

      // Approval transition fires once.
      const prevTier = lastTierRef.current;
      lastTierRef.current = parsed.tier;
      if (
        !approvedFiredRef.current &&
        prevTier === "pending" &&
        parsed.tier !== "pending" &&
        parsed.tier !== "suspended"
      ) {
        approvedFiredRef.current = true;
        onApprovedRef.current?.(parsed);
      }
      // Edge: first-ever poll lands as already-approved (tier flip happened
      // before mount). Treat that as approval too — the user shouldn't sit
      // on /awaiting-approval if they're already in.
      if (
        !approvedFiredRef.current &&
        prevTier === null &&
        parsed.tier !== "pending" &&
        parsed.tier !== "suspended"
      ) {
        approvedFiredRef.current = true;
        onApprovedRef.current?.(parsed);
      }
    } catch (e) {
      failsRef.current += 1;
      setError(e instanceof Error ? e : new Error("Unknown error"));
      if (modeRef.current === "active" && failsRef.current >= failsBeforeBackoff) {
        setModeBoth("backoff");
      } else if (modeRef.current === "backoff" && failsRef.current >= failsBeforeBackoff + failsBeforeStop) {
        setModeBoth("stopped");
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [failsBeforeBackoff, failsBeforeStop, setModeBoth]);

  const schedule = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (modeRef.current === "stopped") return;
    if (typeof document !== "undefined" && document.hidden) return;
    const delay = modeRef.current === "backoff" ? backoffIntervalMs : activeIntervalMs;
    timerRef.current = setTimeout(async () => {
      await tick();
      schedule();
    }, delay);
  }, [activeIntervalMs, backoffIntervalMs, tick]);

  const refresh = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await tick();
    schedule();
  }, [schedule, tick]);

  // Mount: kick off an immediate poll, then schedule.
  useEffect(() => {
    void (async () => {
      await tick();
      schedule();
    })();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visibility: pause on hide, immediate poll + reschedule on show.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisChange = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      if (modeRef.current === "stopped") return;
      void (async () => {
        await tick();
        schedule();
      })();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [schedule, tick]);

  return { status, mode, loading, error, refresh };
}
