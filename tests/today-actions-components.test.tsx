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
  it("default state renders Mark ready + Skip + Edit buttons", () => {
    render(
      <RecipientCard
        item={makeItem()}
        onMarkReady={vi.fn()}
        onMarkSkipped={vi.fn()}
        onEditCard={vi.fn().mockResolvedValue(makeItem())}
      />,
    );
    expect(screen.getByRole("button", { name: "Mark ready" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("ready state renders Edit + Skip + Unmark ready", () => {
    render(
      <RecipientCard
        item={makeItem({ status: "ready" })}
        onMarkSkipped={vi.fn()}
        onMarkDefault={vi.fn()}
        onEditCard={vi.fn().mockResolvedValue(makeItem({ status: "ready" }))}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmark ready" })).toBeInTheDocument();
  });

  it("skipped state renders Bring back only", () => {
    render(
      <RecipientCard item={makeItem({ status: "skipped" })} onMarkDefault={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Bring back" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark ready" })).not.toBeInTheDocument();
  });

  it("Mark ready click invokes handler with item id", () => {
    const onMarkReady = vi.fn();
    render(<RecipientCard item={makeItem()} onMarkReady={onMarkReady} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark ready" }));
    expect(onMarkReady).toHaveBeenCalledWith("c1");
  });

  it("autopilot variant renders inline templates note + Skip this one on default cards", () => {
    render(
      <RecipientCard
        item={makeItem({ status: "default" })}
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
    render(<RecipientCard item={makeItem()} onEditCard={vi.fn()} />);
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
    const btn = screen.getByRole("button", { name: /Send today's batch/ });
    expect(btn).toBeDisabled();
  });

  it("Send button click fires onSend when ready", () => {
    const onSend = vi.fn();
    render(
      <TodayHeader cap={7} sentToday={0} readyCount={2} defaultCount={5} onSend={onSend} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send today's batch/ }));
    expect(onSend).toHaveBeenCalled();
  });

  it("renders 'Mark all ready' ghost when defaultCount >=10", () => {
    render(
      <TodayHeader
        cap={20}
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
        cap={20}
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
      <TodayAutopilotHeader cap={20} sentToday={12} paused={false} onPause={vi.fn()} />,
    );
    expect(screen.getByText(/Autopilot · 12 of 20 sent today/)).toBeInTheDocument();
    expect(screen.getByText(/Knock will send 8 more through the afternoon/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pause autopilot" }).length).toBeGreaterThan(0);
  });

  it("paused variant: shows resume + switch-to-manual", () => {
    render(
      <TodayAutopilotHeader
        cap={20}
        sentToday={12}
        paused
        onResume={vi.fn()}
        onSwitchToManual={vi.fn()}
      />,
    );
    expect(screen.getByText(/Autopilot paused · 12 of 20 sent/)).toBeInTheDocument();
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
  it("renders all shortcuts when open", () => {
    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Next card")).toBeInTheDocument();
    expect(screen.getByText("Open inline editor")).toBeInTheDocument();
    expect(screen.getByText("Send today's batch")).toBeInTheDocument();
  });

  it("hidden when open=false", () => {
    render(<KeyboardShortcutsDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
  });
});
