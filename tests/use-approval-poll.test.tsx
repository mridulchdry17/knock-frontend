import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useApprovalPoll } from "@/lib/auth/use-approval-poll";

function mockResp(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Drains pending microtasks repeatedly so awaited fetches settle. */
async function flush(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("useApprovalPoll state machine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts in active mode and renders the first status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(mockResp(200, { tier: "pending", waitlist_email: "a@b.co", onboarded: true })),
    );

    const { result } = renderHook(() => useApprovalPoll());

    await act(async () => {
      await flush();
    });

    expect(result.current.mode).toBe("active");
    expect(result.current.status?.tier).toBe("pending");
  });

  it("escalates to backoff after N consecutive failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResp(500, { error: { code: "boom", message: "We hit a snag. Try again in a moment." } }),
        ),
    );

    const { result } = renderHook(() =>
      useApprovalPoll({
        activeIntervalMs: 10,
        backoffIntervalMs: 1000,
        failsBeforeBackoff: 3,
        failsBeforeStop: 5,
      }),
    );

    // Initial poll = fail #1
    await act(async () => {
      await flush();
    });
    // 2nd
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11);
      await flush();
    });
    // 3rd — flips to backoff after this resolves
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11);
      await flush();
    });

    expect(result.current.mode).toBe("backoff");
  });

  it("fires onApproved exactly once on tier flip pending → free", async () => {
    let callNum = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callNum += 1;
        if (callNum === 1) return mockResp(200, { tier: "pending", waitlist_email: null, onboarded: true });
        return mockResp(200, { tier: "free", waitlist_email: "a@b.co", onboarded: true });
      }),
    );

    const onApproved = vi.fn();
    renderHook(() =>
      useApprovalPoll({
        activeIntervalMs: 10,
        onApproved,
      }),
    );

    // Initial = pending
    await act(async () => {
      await flush();
    });
    // Second tick — flips to free, fires onApproved
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11);
      await flush();
    });
    // Third — should NOT fire again
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11);
      await flush();
    });

    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(onApproved.mock.calls[0][0].tier).toBe("free");
  });
});
