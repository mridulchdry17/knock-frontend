import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { RecipientCard } from "@/components/knock/recipient-card";
import { TodayHeader } from "@/components/knock/today-header";
import { TodayAutopilotHeader } from "@/components/knock/today-autopilot-header";
import { CardEditor } from "@/components/knock/card-editor";
import { KeyboardShortcutsDialog } from "@/components/knock/keyboard-shortcuts-dialog";
import type { TodayItem } from "@/lib/today/types";

function makeItem(overrides: Partial<TodayItem> = {}): TodayItem {
  return {
    id: "c1",
    recipient: {
      name: "Sarah Chen",
      email: "sarah@stripe.com",
      role: "Recruiter",
      company: "Stripe",
      company_domain: "stripe.com",
      linkedin_url: null,
    },
    template_id: "t1",
    template_name: "Recruiter intro",
    subject: "Quick intro",
    body_preview: "Hi Sarah",
    body: "Hi Sarah, full body.",
    send_time: "2026-05-05T09:42:00Z",
    status: "default",
    cooldown_until: null,
    sent_at: null,
    ...overrides,
  };
}

describe("<RecipientCard /> action layer", () => {
  // Skip-then-send model: cards have NO "Mark ready" — every In card sends
  // unless skipped. Per-card actions are just Edit + Skip.
  it("In (default) card renders Edit + Skip, and NO Mark ready", () => {
    render(
      <RecipientCard
        item={makeItem()}
        defaultExpanded
        onMarkSkipped={vi.fn()}
        onEditCard={vi.fn().mockResolvedValue(makeItem())}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark ready" })).not.toBeInTheDocument();
  });

  it("ready card behaves the same as In: Edit + Skip, no Unmark ready", () => {
    render(
      <RecipientCard
        item={makeItem({ status: "ready" })}
        defaultExpanded
        onMarkSkipped={vi.fn()}
        onMarkDefault={vi.fn()}
        onEditCard={vi.fn().mockResolvedValue(makeItem({ status: "ready" }))}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unmark ready" })).not.toBeInTheDocument();
  });

  it("skipped state renders Bring back only", () => {
    render(
      <RecipientCard item={makeItem({ status: "skipped" })} defaultExpanded onMarkDefault={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Bring back" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark ready" })).not.toBeInTheDocument();
  });

  it("Skip click invokes handler with item id", () => {
    const onMarkSkipped = vi.fn();
    render(<RecipientCard item={makeItem()} defaultExpanded onMarkSkipped={onMarkSkipped} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onMarkSkipped).toHaveBeenCalledWith("c1");
  });

  it("autopilot variant renders inline templates note + Skip this one on default cards", () => {
    render(
      <RecipientCard
        item={makeItem({ status: "default" })}
        defaultExpanded
        autopilot
        onAutopilotSkip={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Autopilot uses your templates as-is/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip this one" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark ready" })).not.toBeInTheDocument();
  });

  it("send-time chip is a button when editable", () => {
    render(<RecipientCard item={makeItem()} defaultExpanded onEditCard={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Send time:/ }),
    ).toBeInTheDocument();
  });
});

describe("<TodayHeader /> send button", () => {
  it("disables Send when readyCount===0 + tooltip copy is locked", () => {
    render(
      <TodayHeader
        cap={7}
        sentToday={0}
        readyCount={0}
        defaultCount={3}
        onSend={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Approve today's batch/ });
    expect(btn).toBeDisabled();
  });

  it("Send button click fires onSend when ready", () => {
    const onSend = vi.fn();
    render(
      <TodayHeader cap={7} sentToday={0} readyCount={2} defaultCount={5} onSend={onSend} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Approve today's batch/ }));
    expect(onSend).toHaveBeenCalled();
  });

  it("renders 'Mark all ready' ghost when defaultCount >=10", () => {
    render(
      <TodayHeader
        cap={15}
        sentToday={0}
        readyCount={0}
        defaultCount={11}
        onSend={vi.fn()}
        onMarkAllReady={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark all ready" })).toBeInTheDocument();
  });

  it("hides 'Mark all ready' when defaultCount <10", () => {
    render(
      <TodayHeader
        cap={15}
        sentToday={0}
        readyCount={0}
        defaultCount={5}
        onSend={vi.fn()}
        onMarkAllReady={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Mark all ready" })).not.toBeInTheDocument();
  });
});

describe("<TodayAutopilotHeader />", () => {
  it("active variant: title + subtitle + Pause autopilot", () => {
    render(
      <TodayAutopilotHeader cap={15} sentToday={12} paused={false} onPause={vi.fn()} />,
    );
    expect(screen.getByText(/Autopilot · 12 of 15 sent today/)).toBeInTheDocument();
    expect(screen.getByText(/Knock will send 3 more through the afternoon/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pause autopilot" }).length).toBeGreaterThan(0);
  });

  it("paused variant: shows resume + switch-to-manual", () => {
    render(
      <TodayAutopilotHeader
        cap={15}
        sentToday={12}
        paused
        onResume={vi.fn()}
        onSwitchToManual={vi.fn()}
      />,
    );
    expect(screen.getByText(/Autopilot paused · 12 of 15 sent/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume autopilot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to manual review" })).toBeInTheDocument();
  });
});

describe("<CardEditor /> autosave", () => {
  it("debounced autosave fires ~800ms after last keystroke", async () => {
    vi.useFakeTimers();
    try {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const item = makeItem();
      render(<CardEditor item={item} onSave={onSave} onCancel={vi.fn()} />);
      const subject = screen.getByLabelText("Email subject") as HTMLInputElement;
      fireEvent.change(subject, { target: { value: "New" } });
      // Before debounce window, no save.
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onSave).not.toHaveBeenCalled();
      // After 800ms total, save fires.
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(onSave).toHaveBeenCalledWith({ subject: "New", body: item.body });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows snag voice when save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("boom"));
    const item = makeItem();
    render(<CardEditor item={item} onSave={onSave} onCancel={vi.fn()} />);
    const subject = screen.getByLabelText("Email subject") as HTMLInputElement;
    fireEvent.change(subject, { target: { value: "Different" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen.getByText(/We hit a snag saving\. Your changes are still here/),
      ).toBeInTheDocument(),
    );
  });

  it("Escape calls onCancel", () => {
    const onCancel = vi.fn();
    render(<CardEditor item={makeItem()} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByTestId("card-editor"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("Preview toggle swaps to read-only frame", () => {
    render(<CardEditor item={makeItem()} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.queryByLabelText("Email subject")).not.toBeInTheDocument();
    expect(screen.getByText("Quick intro")).toBeInTheDocument();
  });
});

describe("<KeyboardShortcutsDialog />", () => {
  it("renders categorized shortcuts when open", () => {
    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    // Categories
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    // Sample bindings
    expect(screen.getByText("Open inline editor")).toBeInTheDocument();
    expect(screen.getByText("Approve today's batch")).toBeInTheDocument();
    expect(screen.getByText("Open selected thread")).toBeInTheDocument();
  });

  it("hidden when open=false", () => {
    render(<KeyboardShortcutsDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
  });
});
