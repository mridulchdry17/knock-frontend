import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listWaitlist = vi.fn();
const downloadWaitlistCsv = vi.fn();
const approveWaitlist = vi.fn();
const revokeWaitlist = vi.fn();

vi.mock("@/lib/admin/waitlist", () => ({
  listWaitlist: (...args: unknown[]) => listWaitlist(...args),
  downloadWaitlistCsv: () => downloadWaitlistCsv(),
  approveWaitlist: (...args: unknown[]) => approveWaitlist(...args),
  revokeWaitlist: (...args: unknown[]) => revokeWaitlist(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import { WaitlistView } from "@/components/admin/waitlist-view";

describe("/admin/waitlist — WaitlistView", () => {
  beforeEach(() => {
    listWaitlist.mockReset();
    downloadWaitlistCsv.mockReset();
    approveWaitlist.mockReset();
    revokeWaitlist.mockReset();
  });

  it("renders the waitlist and total count", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        { id: "1", email: "a@x.co", created_at: "2025-04-29T00:00:00Z" },
        { id: "2", email: "b@x.co", created_at: "2025-04-30T00:00:00Z" },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WaitlistView />);
    await screen.findAllByText("a@x.co");
    expect(screen.getAllByText("b@x.co").length).toBeGreaterThan(0);
    expect(screen.getByText("Total: 2")).toBeInTheDocument();
  });

  it("renders empty state when there's no waitlist", async () => {
    listWaitlist.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<WaitlistView />);
    await screen.findByText("No one on the waitlist yet.");
  });

  it("triggers downloadWaitlistCsv on button click", async () => {
    listWaitlist.mockResolvedValue({
      items: [{ id: "1", email: "a@x.co", created_at: "2025-04-29T00:00:00Z" }],
      total: 1,
      limit: 50,
      offset: 0,
    });
    downloadWaitlistCsv.mockResolvedValue(undefined);

    render(<WaitlistView />);
    await screen.findAllByText("a@x.co");
    await userEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    await waitFor(() => {
      expect(downloadWaitlistCsv).toHaveBeenCalled();
    });
  });

  it("shows 'Waiting' + 'Allow in' for an un-approved entry, and approves on click", async () => {
    listWaitlist.mockResolvedValue({
      items: [{ id: "7", email: "wait@x.co", created_at: "2025-04-29T00:00:00Z", approved_at: null }],
      total: 1,
      limit: 50,
      offset: 0,
    });
    approveWaitlist.mockResolvedValue({
      id: "7",
      email: "wait@x.co",
      created_at: "2025-04-29T00:00:00Z",
      approved_at: "2026-05-25T00:00:00Z",
    });

    render(<WaitlistView />);
    await screen.findAllByText("wait@x.co");
    expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Allow in" })[0]);

    await waitFor(() => expect(approveWaitlist).toHaveBeenCalledWith("7"));
    // Badge flips to "Allowed" after the optimistic local update.
    await waitFor(() => expect(screen.getAllByText("Allowed").length).toBeGreaterThan(0));
  });

  it("shows 'Allowed' + 'Revoke' for an approved entry, and revokes on click", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        { id: "9", email: "in@x.co", created_at: "2025-04-29T00:00:00Z", approved_at: "2026-05-25T00:00:00Z" },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    revokeWaitlist.mockResolvedValue({
      id: "9",
      email: "in@x.co",
      created_at: "2025-04-29T00:00:00Z",
      approved_at: null,
    });

    render(<WaitlistView />);
    await screen.findAllByText("in@x.co");
    expect(screen.getAllByText("Allowed").length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Revoke" })[0]);

    await waitFor(() => expect(revokeWaitlist).toHaveBeenCalledWith("9"));
    await waitFor(() => expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0));
  });
});
