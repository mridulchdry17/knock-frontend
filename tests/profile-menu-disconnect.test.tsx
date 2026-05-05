import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn().mockResolvedValue(undefined);
const signOutRemote = vi.fn().mockResolvedValue(undefined);

let connected = true;
vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "u@example.com",
      name: "Sam",
      tier: "free",
      onboarded: true,
      gmail_connected: connected,
    },
    refresh,
    signOutRemote,
  }),
}));

const disconnectGmailMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth/gmail", () => ({
  disconnectGmail: () => disconnectGmailMock(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
}));

vi.mock("@/components/shell/theme-toggle-row", () => ({
  ThemeToggleRow: () => null,
}));

import { ProfileMenu } from "@/components/shell/profile-menu";

/**
 * Radix DropdownMenu uses pointer events under the hood, which jsdom + fireEvent.click
 * don't synthesize cleanly. We use userEvent to drive the menu open.
 */

describe("ProfileMenu — Disconnect Gmail", () => {
  beforeEach(() => {
    refresh.mockClear();
    disconnectGmailMock.mockClear();
  });

  it("shows the Disconnect Gmail item only when connected", async () => {
    connected = true;
    const user = userEvent.setup();
    render(<ProfileMenu />);
    await user.click(screen.getByLabelText("Open profile menu"));
    expect(await screen.findByText("Disconnect Gmail")).toBeInTheDocument();
  });

  it("hides Disconnect Gmail when already disconnected", async () => {
    connected = false;
    const user = userEvent.setup();
    render(<ProfileMenu />);
    await user.click(screen.getByLabelText("Open profile menu"));
    // Wait for menu to open by querying for any always-present item.
    expect(await screen.findByText("Help & docs")).toBeInTheDocument();
    expect(screen.queryByText("Disconnect Gmail")).toBeNull();
  });

  it("opens confirm dialog and calls API on confirm", async () => {
    connected = true;
    const user = userEvent.setup();
    render(<ProfileMenu />);
    await user.click(screen.getByLabelText("Open profile menu"));
    await user.click(await screen.findByText("Disconnect Gmail"));

    expect(
      await screen.findByText(/Knock won't be able to send until you reconnect\./),
    ).toBeInTheDocument();

    await act(async () => {
      const buttons = screen.getAllByRole("button", { name: /Disconnect Gmail/ });
      // The dialog confirm button (last in DOM after the dropdown closed).
      fireEvent.click(buttons[buttons.length - 1]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(disconnectGmailMock).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
  });
});
