import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "u@example.com", name: null, tier: "pending", onboarded: false, gmail_connected: false },
    refresh,
  }),
}));

const claimWaitlist = vi.fn();
const joinWaitlist = vi.fn();
vi.mock("@/lib/auth/onboarding", () => ({
  claimWaitlist: (...args: unknown[]) => claimWaitlist(...args),
  joinWaitlist: () => joinWaitlist(),
  logout: vi.fn(),
  fetchOnboardingStatus: vi.fn(),
}));

import OnboardingClient from "@/app/(public)/onboarding/onboarding-client";
import { ApiError } from "@/lib/api/errors";

describe("/onboarding", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockClear();
    claimWaitlist.mockReset();
    joinWaitlist.mockReset();
  });

  it("renders both branches by default", () => {
    render(<OnboardingClient />);
    expect(screen.getByText(/Welcome — glad you knocked\./i)).toBeInTheDocument();
    expect(screen.getByText(/I joined the waitlist with a different email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join the waitlist/i })).toBeInTheDocument();
  });

  it("claim 200 → refresh + replace('/today')", async () => {
    claimWaitlist.mockResolvedValueOnce({ tier: "free", waitlist_email: "a@b.co", onboarded: true });
    const user = userEvent.setup();
    render(<OnboardingClient />);

    await user.click(screen.getByText(/I joined the waitlist with a different email/i));
    await user.type(screen.getByLabelText(/Waitlist email/i), "a@b.co");
    await user.click(screen.getByRole("button", { name: /Claim my spot/i }));

    await waitFor(() => {
      expect(claimWaitlist).toHaveBeenCalledWith("a@b.co");
      expect(refresh).toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith("/today");
    });
  });

  it("claim 404 not_on_waitlist → inline alert + offer 'Switch to I'm new'", async () => {
    claimWaitlist.mockRejectedValueOnce(new ApiError(404, "not_on_waitlist", "not found"));
    const user = userEvent.setup();
    render(<OnboardingClient />);

    await user.click(screen.getByText(/I joined the waitlist with a different email/i));
    await user.type(screen.getByLabelText(/Waitlist email/i), "x@y.co");
    await user.click(screen.getByRole("button", { name: /Claim my spot/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't find a waitlist entry/i);
      expect(screen.getByRole("button", { name: /Switch to/i })).toBeInTheDocument();
    });
  });

  it("claim 409 waitlist_email_taken → danger alert", async () => {
    claimWaitlist.mockRejectedValueOnce(new ApiError(409, "waitlist_email_taken", "taken"));
    const user = userEvent.setup();
    render(<OnboardingClient />);

    await user.click(screen.getByText(/I joined the waitlist with a different email/i));
    await user.type(screen.getByLabelText(/Waitlist email/i), "x@y.co");
    await user.click(screen.getByRole("button", { name: /Claim my spot/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/already linked to another account/i);
    });
  });

  it("'Join the waitlist' → POST + replace('/awaiting-approval')", async () => {
    joinWaitlist.mockResolvedValueOnce({ status: "awaiting_approval" });
    const user = userEvent.setup();
    render(<OnboardingClient />);

    await user.click(screen.getByRole("button", { name: /Join the waitlist/i }));

    await waitFor(() => {
      expect(joinWaitlist).toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith("/awaiting-approval");
    });
  });
});
