import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InboxList } from "@/components/knock/inbox-list";
import type { InboxItem } from "@/lib/inbox/types";

function item(over: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "th-1",
    category: "reply",
    subject: "Re: Hi",
    sender: { name: "Sarah Chen", email: "sarah@acme.com" },
    snippet: "Hello there",
    last_message_at: new Date().toISOString(),
    unread: true,
    message_count: 2,
    ...over,
  };
}

describe("<InboxList>", () => {
  it("renders unread pill with count", () => {
    render(
      <InboxList
        status="populated"
        items={[item()]}
        unreadCount={3}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy
        onSyncRetry={() => {}}
        variant="desktop"
      />,
    );
    expect(screen.getByTestId("unread-pill")).toHaveTextContent("3 unread");
  });

  it("renders 'All caught up.' empty state", () => {
    render(
      <InboxList
        status="empty"
        items={[]}
        unreadCount={0}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy
        onSyncRetry={() => {}}
        variant="desktop"
      />,
    );
    expect(screen.getByText("All caught up.")).toBeInTheDocument();
    expect(
      screen.getByText("When recruiters write back, you'll see them here."),
    ).toBeInTheDocument();
  });

  it("renders sync-failure banner when unhealthy and hides when healthy", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <InboxList
        status="empty"
        items={[]}
        unreadCount={0}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy={false}
        onSyncRetry={onRetry}
        variant="desktop"
      />,
    );
    const banner = screen.getByTestId("sync-failure-banner");
    expect(banner).toHaveTextContent(
      "We can’t sync from Gmail right now. Showing what we have.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();

    rerender(
      <InboxList
        status="empty"
        items={[]}
        unreadCount={0}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy
        onSyncRetry={onRetry}
        variant="desktop"
      />,
    );
    expect(screen.queryByTestId("sync-failure-banner")).toBeNull();
  });

  it("invokes onSelect with the row id", () => {
    const onSelect = vi.fn();
    render(
      <InboxList
        status="populated"
        items={[item({ id: "th-9" })]}
        unreadCount={1}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={onSelect}
        syncHealthy
        onSyncRetry={() => {}}
        variant="desktop"
      />,
    );
    fireEvent.click(screen.getByTestId("inbox-row-th-9"));
    expect(onSelect).toHaveBeenCalledWith("th-9");
  });

  it("category chip shows 'Bounce' for bounce items", () => {
    render(
      <InboxList
        status="populated"
        items={[item({ id: "x", category: "bounce" })]}
        unreadCount={0}
        tab="all"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy
        onSyncRetry={() => {}}
        variant="desktop"
      />,
    );
    expect(screen.getByText("Bounce")).toBeInTheDocument();
  });

  it("renders 5 skeleton rows when loading", () => {
    render(
      <InboxList
        status="loading"
        items={[]}
        unreadCount={0}
        tab="replies"
        onTabChange={() => {}}
        selectedId={null}
        onSelect={() => {}}
        syncHealthy
        onSyncRetry={() => {}}
        variant="desktop"
      />,
    );
    const list = screen.getByLabelText("Loading inbox");
    expect(list.querySelectorAll("li").length).toBe(5);
  });
});
