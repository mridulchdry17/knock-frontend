import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listWaitlist = vi.fn();
const downloadWaitlistCsv = vi.fn();
const approveWaitlist = vi.fn();
const revokeWaitlist = vi.fn();
const bulkApproveWaitlist = vi.fn();

vi.mock("@/lib/admin/waitlist", () => ({
  listWaitlist: (...args: unknown[]) => listWaitlist(...args),
  downloadWaitlistCsv: () => downloadWaitlistCsv(),
  approveWaitlist: (...args: unknown[]) => approveWaitlist(...args),
  revokeWaitlist: (...args: unknown[]) => revokeWaitlist(...args),
  bulkApproveWaitlist: (...args: unknown[]) => bulkApproveWaitlist(...args),
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
    bulkApproveWaitlist.mockReset();
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
    // Header was "Total: 2", now "Showing 2" after the tab/search refactor.
    expect(screen.getByText("Showing 2")).toBeInTheDocument();
  });

  it("renders the empty-pending message on the default Pending tab", async () => {
    listWaitlist.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<WaitlistView />);
    await screen.findByText("No one waiting. New signups will land here.");
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

  it("shows 'Waiting' + 'Allow as free' for an un-approved entry, and approves as free on click", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        {
          id: "7",
          email: "wait@x.co",
          created_at: "2025-04-29T00:00:00Z",
          approved_at: null,
          intended_tier: "free",
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    approveWaitlist.mockResolvedValue({
      id: "7",
      email: "wait@x.co",
      created_at: "2025-04-29T00:00:00Z",
      approved_at: "2026-05-25T00:00:00Z",
      intended_tier: "free",
    });

    render(<WaitlistView />);
    await screen.findAllByText("wait@x.co");
    expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Allow as free" })[0]);

    await waitFor(() => expect(approveWaitlist).toHaveBeenCalledWith("7", "free"));
    // Badge flips to "Allowed · Free" after the optimistic local update.
    await waitFor(() => expect(screen.getAllByText(/Allowed · Free/).length).toBeGreaterThan(0));
  });

  it("clicking 'as paid' approves with tier='paid' and shows 'Allowed · Paid'", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        {
          id: "11",
          email: "vip@x.co",
          created_at: "2025-04-29T00:00:00Z",
          approved_at: null,
          intended_tier: "free",
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    approveWaitlist.mockResolvedValue({
      id: "11",
      email: "vip@x.co",
      created_at: "2025-04-29T00:00:00Z",
      approved_at: "2026-05-25T00:00:00Z",
      intended_tier: "paid",
    });

    render(<WaitlistView />);
    await screen.findAllByText("vip@x.co");

    await userEvent.click(screen.getAllByRole("button", { name: "as paid" })[0]);

    await waitFor(() => expect(approveWaitlist).toHaveBeenCalledWith("11", "paid"));
    await waitFor(() => expect(screen.getAllByText(/Allowed · Paid/).length).toBeGreaterThan(0));
  });

  it("shows 'Allowed' + 'Revoke' for an approved entry, and revokes on click", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        {
          id: "9",
          email: "in@x.co",
          created_at: "2025-04-29T00:00:00Z",
          approved_at: "2026-05-25T00:00:00Z",
          intended_tier: "free",
        },
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
      intended_tier: "free",
    });

    render(<WaitlistView />);
    await screen.findAllByText("in@x.co");
    expect(screen.getAllByText(/Allowed/).length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Revoke" })[0]);

    await waitFor(() => expect(revokeWaitlist).toHaveBeenCalledWith("9"));
    await waitFor(() => expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0));
  });

  // ─────────────────────────── search / status / sort ───────────────────────────

  it("debounces search and passes the term to listWaitlist", async () => {
    listWaitlist.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<WaitlistView />);
    await waitFor(() => expect(listWaitlist).toHaveBeenCalled());

    const searchInput = screen.getByRole("searchbox", { name: /search waitlist/i });
    await userEvent.type(searchInput, "stripe");

    // 300ms debounce — wait for the call with search term.
    await waitFor(
      () => {
        const lastCall = listWaitlist.mock.calls.at(-1);
        expect(lastCall?.[0]).toMatchObject({ search: "stripe", status: "pending" });
      },
      { timeout: 1500 },
    );
  });

  it("switching to Approved tab passes status='approved'", async () => {
    listWaitlist.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<WaitlistView />);
    await waitFor(() => expect(listWaitlist).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("tab", { name: "Approved" }));
    await waitFor(() => {
      const lastCall = listWaitlist.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ status: "approved" });
    });
  });

  it("changing sort to oldest passes sort='oldest'", async () => {
    listWaitlist.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    render(<WaitlistView />);
    await waitFor(() => expect(listWaitlist).toHaveBeenCalled());

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /sort/i }),
      "oldest",
    );
    await waitFor(() => {
      const lastCall = listWaitlist.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ sort: "oldest" });
    });
  });

  // ─────────────────────────── bulk approve ───────────────────────────

  it("selecting rows shows the sticky bar and bulk-approves the right ids", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        {
          id: "10",
          email: "p1@x.co",
          created_at: "2025-04-29T00:00:00Z",
          approved_at: null,
          intended_tier: "free",
        },
        {
          id: "11",
          email: "p2@x.co",
          created_at: "2025-04-30T00:00:00Z",
          approved_at: null,
          intended_tier: "free",
        },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    });
    bulkApproveWaitlist.mockResolvedValue({
      newly_approved: 2,
      already_approved: 0,
      not_found_ids: [],
    });

    render(<WaitlistView />);
    await screen.findAllByText("p1@x.co");

    // Both rows are pending → checkboxes available. The desktop table AND
    // mobile card list both render — getAllByRole picks the first match
    // (desktop variant), which is fine; clicking either flips the same state.
    await userEvent.click(
      screen.getAllByRole("checkbox", { name: "Select p1@x.co" })[0],
    );
    await userEvent.click(
      screen.getAllByRole("checkbox", { name: "Select p2@x.co" })[0],
    );

    // Sticky bar shows count
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Approve 2 as free/ }),
    );

    await waitFor(() =>
      expect(bulkApproveWaitlist).toHaveBeenCalledWith([10, 11], "free"),
    );
  });

  it("does NOT show bulk-select checkboxes on the Approved tab", async () => {
    listWaitlist.mockResolvedValue({
      items: [
        {
          id: "42",
          email: "approved@x.co",
          created_at: "2025-04-29T00:00:00Z",
          approved_at: "2026-05-01T00:00:00Z",
          intended_tier: "free",
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    render(<WaitlistView />);
    await screen.findAllByText("approved@x.co");

    await userEvent.click(screen.getByRole("tab", { name: "Approved" }));
    await waitFor(() => {
      const lastCall = listWaitlist.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ status: "approved" });
    });
    // Only un-approved rows on the Pending tab get checkboxes. On Approved
    // there should be no 'Select all on page' checkbox in the header.
    expect(
      screen.queryByRole("checkbox", { name: /select all on page/i }),
    ).toBeNull();
  });
});
