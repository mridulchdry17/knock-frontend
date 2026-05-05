import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const refresh = vi.fn().mockResolvedValue(undefined);
const clearReauthFlag = vi.fn();

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "u@example.com",
      name: null,
      tier: "free",
      onboarded: true,
      gmail_connected: false,
    },
    refresh,
    clearReauthFlag,
  }),
}));

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import ConnectGmailClient from "@/app/(public)/connect-gmail/connect-gmail-client";

describe("/connect-gmail", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    refresh.mockClear();
    clearReauthFlag.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders pre-consent default — first-connect copy", () => {
    render(<ConnectGmailClient />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Connect your Gmail\./);
    expect(screen.getByRole("button", { name: /Connect my Gmail/i })).toBeInTheDocument();
    expect(screen.getByText(/Knock sends from your real inbox/)).toBeInTheDocument();
  });

  it("renders pre-consent with reauth copy when ?reauth=1", () => {
    searchParams = new URLSearchParams("reauth=1");
    render(<ConnectGmailClient />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Reconnect your Gmail\./);
    expect(screen.getByRole("button", { name: /^Reconnect$/ })).toBeInTheDocument();
    expect(screen.getByText(/Just a quick reconnect/)).toBeInTheDocument();
  });

  it("renders OAuth in-flight panel when ?status=in_flight", () => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams("status=in_flight");
    render(<ConnectGmailClient />);
    expect(screen.getByText(/We’ll be right here\./)).toBeInTheDocument();
    expect(screen.getByText(/Finishing up with Google/)).toBeInTheDocument();
    expect(screen.queryByText(/Taking longer than usual/)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(8100);
    });
    expect(screen.getByText(/Taking longer than usual/)).toBeInTheDocument();
  });

  it("renders the trust grid in pre-consent", () => {
    render(<ConnectGmailClient />);
    expect(screen.getByText("What we ask Google for")).toBeInTheDocument();
    expect(screen.getByText("What we never do")).toBeInTheDocument();
  });
});
