import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listUsers = vi.fn();
const updateTier = vi.fn();
const suspendUser = vi.fn();
const unsuspendUser = vi.fn();

vi.mock("@/lib/admin/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/users")>(
    "@/lib/admin/users",
  );
  return {
    ...actual,
    listUsers: (...args: unknown[]) => listUsers(...args),
    updateTier: (...args: unknown[]) => updateTier(...args),
    suspendUser: (...args: unknown[]) => suspendUser(...args),
    unsuspendUser: (...args: unknown[]) => unsuspendUser(...args),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import { UsersView } from "@/components/admin/users-view";

const pendingUser = {
  id: "1",
  email: "alice@example.com",
  full_name: "Alice",
  tier: "pending" as const,
  waitlist_email: null,
  is_suspended: false,
  has_gmail_connected: false,
  created_at: "2025-04-30T00:00:00Z",
  tier_set_at: null,
};

const freeUser = {
  id: "2",
  email: "bob@example.com",
  full_name: null,
  tier: "free" as const,
  waitlist_email: null,
  is_suspended: false,
  has_gmail_connected: true,
  created_at: "2025-04-29T00:00:00Z",
  tier_set_at: "2025-04-29T05:00:00Z",
};

type AnyUser = typeof pendingUser | typeof freeUser;
function pageOf(items: AnyUser[]) {
  return { items, total: items.length, limit: 50, offset: 0 };
}

describe("/admin/users — UsersView", () => {
  beforeEach(() => {
    listUsers.mockReset();
    updateTier.mockReset();
    suspendUser.mockReset();
    unsuspendUser.mockReset();
  });

  it("defaults to the Pending tab and lists pending users", async () => {
    listUsers.mockResolvedValue(pageOf([pendingUser]));
    render(<UsersView />);

    await screen.findAllByText("alice@example.com");
    const firstCall = listUsers.mock.calls[0][0];
    expect(firstCall.tier).toBe("pending");
  });

  it("debounces search and forwards the query", async () => {
    listUsers.mockResolvedValue(pageOf([]));
    render(<UsersView />);

    const input = await screen.findByPlaceholderText("Search by email");
    await userEvent.type(input, "alice");

    // Wait for debounce + listUsers call with search.
    await waitFor(
      () => {
        const calls = listUsers.mock.calls.map((c) => c[0]);
        expect(calls.some((p) => p.search === "alice")).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it("switches tabs and refetches with the right tier", async () => {
    listUsers.mockResolvedValue(pageOf([freeUser]));
    render(<UsersView />);

    await screen.findByRole("tab", { name: "Free" });
    await userEvent.click(screen.getByRole("tab", { name: "Free" }));

    await waitFor(() => {
      const lastCall = listUsers.mock.calls.at(-1)?.[0];
      expect(lastCall?.tier).toBe("free");
    });
  });

  it("Approve inline-morph: click Approve → Yes → calls updateTier(free)", async () => {
    listUsers.mockResolvedValue(pageOf([pendingUser]));
    updateTier.mockResolvedValue({ ...pendingUser, tier: "free" });

    render(<UsersView />);
    await screen.findAllByText("alice@example.com");

    const approveBtn = screen.getAllByRole("button", { name: "Approve" })[0];
    await userEvent.click(approveBtn);

    // Inline confirm should now appear.
    expect(screen.getByText(/Approve alice@example.com\?/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(updateTier).toHaveBeenCalledWith("1", "free");
    });
  });

  it("Reject inline-morph: with reason → calls suspendUser(reason)", async () => {
    listUsers.mockResolvedValue(pageOf([pendingUser]));
    suspendUser.mockResolvedValue({ ...pendingUser, is_suspended: true });

    render(<UsersView />);
    await screen.findAllByText("alice@example.com");

    const rejectBtn = screen.getAllByRole("button", { name: "Reject" })[0];
    await userEvent.click(rejectBtn);

    const reasonInput = screen.getByLabelText("Reason");
    await userEvent.type(reasonInput, "duplicate");
    // The inline-confirm submit lives inside the same role=group as the question.
    const group = screen.getByRole("group");
    const submit = within(group).getByRole("button", { name: "Reject" });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(suspendUser).toHaveBeenCalledWith("1", "duplicate");
    });
  });

  it("Suspend modal: requires reason and calls suspendUser on submit", async () => {
    listUsers.mockResolvedValue(pageOf([freeUser]));
    suspendUser.mockResolvedValue({ ...freeUser, is_suspended: true });

    render(<UsersView />);
    await screen.findByRole("tab", { name: "Free" });
    await userEvent.click(screen.getByRole("tab", { name: "Free" }));
    await screen.findAllByText("bob@example.com");

    await userEvent.click(screen.getAllByRole("button", { name: "Suspend" })[0]);

    // Modal opens.
    const dialogReason = await screen.findByLabelText("Reason");
    await userEvent.type(dialogReason, "abuse");
    // Click the Suspend submit button (now inside the dialog).
    const allSuspendBtns = screen.getAllByRole("button", { name: "Suspend" });
    await userEvent.click(allSuspendBtns.at(-1)!);

    await waitFor(() => {
      expect(suspendUser).toHaveBeenCalledWith("2", "abuse");
    });
  });

  it("renders pending empty state with locked microcopy", async () => {
    listUsers.mockResolvedValue(pageOf([]));
    render(<UsersView />);
    await screen.findByText("No one waiting. New signups will land here.");
  });

  it("renders error banner with Retry button on failure", async () => {
    listUsers.mockRejectedValue(Object.assign(new Error("boom"), { status: 500, code: "x" }));
    render(<UsersView />);
    await screen.findByText(/We hit a snag loading users\./);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
