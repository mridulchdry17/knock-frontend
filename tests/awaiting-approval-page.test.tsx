import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";

async function flush(times = 4) {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

const replace = vi.fn();
const signOutRemote = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "u@example.com",
      name: null,
      tier: "pending",
      onboarded: true,
      gmail_connected: false,
    },
    signOutRemote,
  }),
}));

const toastFn = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastFn(...args), { dismiss: vi.fn() }),
}));

import AwaitingApprovalClient from "@/app/(public)/awaiting-approval/awaiting-approval-client";

function pendingResp() {
  return new Response(JSON.stringify({ tier: "pending", waitlist_email: "u@example.com", onboarded: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
function freeResp() {
  return new Response(JSON.stringify({ tier: "free", waitlist_email: "u@example.com", onboarded: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/awaiting-approval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
    toastFn.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fires the welcome toast and redirects to /connect-gmail on tier flip", async () => {
    let i = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        i += 1;
        return i === 1 ? pendingResp() : freeResp();
      }),
    );

    render(<AwaitingApprovalClient />);

    // Initial poll resolves "pending"
    await act(async () => {
      await flush();
    });

    // Default interval is 60s; advance past it for the second poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
      await flush();
    });

    expect(toastFn).toHaveBeenCalled();
    const [msg] = toastFn.mock.calls[0];
    expect(msg).toMatch(/You're in\. Welcome\./);

    // Auto-route happens 2.4s later.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
      await flush();
    });

    expect(replace).toHaveBeenCalledWith("/connect-gmail");
  });
});
