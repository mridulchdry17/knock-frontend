import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/lib/auth/gmail", () => ({
  disconnectGmail: vi.fn(),
}));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({ refresh: vi.fn().mockResolvedValue(undefined) }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("sonner", () => {
  const fn = vi.fn();
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn() }),
  };
});

import { DisconnectGmailDialog } from "@/components/knock/disconnect-gmail-dialog";
import * as gmailModule from "@/lib/auth/gmail";
import { toast } from "sonner";

const disconnectMock = vi.mocked(gmailModule.disconnectGmail);
const toastFn = toast as unknown as ReturnType<typeof vi.fn>;

describe("<DisconnectGmailDialog />", () => {
  beforeEach(() => {
    disconnectMock.mockReset();
    toastFn.mockReset();
  });

  it("renders the locked copy when open", () => {
    render(<DisconnectGmailDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Disconnect Gmail?")).toBeInTheDocument();
    expect(
      screen.getByText("Knock won't be able to send until you reconnect."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect Gmail" })).toBeInTheDocument();
  });

  it("calls disconnectGmail + closes + toasts on confirm", async () => {
    disconnectMock.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<DisconnectGmailDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Gmail" }));
    await waitFor(() => expect(disconnectMock).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastFn).toHaveBeenCalledWith("Gmail disconnected.");
  });

  it("shows snag voice on failure and stays open", async () => {
    disconnectMock.mockRejectedValue(new Error("boom"));
    const onOpenChange = vi.fn();
    render(<DisconnectGmailDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Gmail" }));
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("We hit a snag. Try again in a moment."),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
