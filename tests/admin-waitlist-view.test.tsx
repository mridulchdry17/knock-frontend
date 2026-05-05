import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listWaitlist = vi.fn();
const downloadWaitlistCsv = vi.fn();

vi.mock("@/lib/admin/waitlist", () => ({
  listWaitlist: (...args: unknown[]) => listWaitlist(...args),
  downloadWaitlistCsv: () => downloadWaitlistCsv(),
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
});
