import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarStrip } from "@/components/knock/avatar-strip";
import { RecipientCard } from "@/components/knock/recipient-card";
import { TodayEmptyState } from "@/components/knock/today-empty-state";
import type { TodayItem, TodayCardStatus } from "@/lib/today/types";

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
    body_preview: "Hi Sarah, I'm a junior at UW...",
    body: "Hi Sarah, I'm a junior at UW...\n\nFull text here.",
    send_time: "2026-05-05T09:42:00Z",
    status: "default",
    cooldown_until: null,
    sent_at: null,
    ...overrides,
  };
}

describe("<AvatarStrip />", () => {
  it("renders one button per item with correct aria-labels", () => {
    const items = [makeItem({ id: "a", status: "ready" }), makeItem({ id: "b", status: "sent" })];
    render(<AvatarStrip items={items} cap={7} />);
    expect(screen.getByLabelText(/Card 1, Sarah Chen, ready/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Card 2, Sarah Chen, sent/)).toBeInTheDocument();
  });

  it("calls onJump with the clicked id", () => {
    const onJump = vi.fn();
    const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
    render(<AvatarStrip items={items} cap={7} onJump={onJump} />);
    fireEvent.click(screen.getByLabelText(/Card 2/));
    expect(onJump).toHaveBeenCalledWith("b");
  });

  it("renders cap-many skeleton dots when loading", () => {
    const { container } = render(<AvatarStrip items={[]} cap={15} loading />);
    const dots = container.querySelectorAll("div.h-8.w-8");
    expect(dots.length).toBe(15);
  });
});

describe("<RecipientCard />", () => {
  it("renders expanded state with name, role, company, subject, template badge", () => {
    render(<RecipientCard item={makeItem()} defaultExpanded />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText(/Recruiter · Stripe/)).toBeInTheDocument();
    expect(screen.getByText("Quick intro")).toBeInTheDocument();
    expect(screen.getByText(/Template: Recruiter intro/)).toBeInTheDocument();
  });

  it("collapsed row is the default and expands on click", () => {
    render(<RecipientCard item={makeItem()} />);
    // Collapsed: name + a one-line "role · company — subject" summary, no template badge.
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.queryByText(/Template: Recruiter intro/)).not.toBeInTheDocument();
    // Click the row → expands to the full card.
    fireEvent.click(screen.getByRole("button", { name: /Review Sarah Chen/ }));
    expect(screen.getByText(/Template: Recruiter intro/)).toBeInTheDocument();
  });

  it("renders cooldown copy with locked phrasing", () => {
    const cooldownIso = new Date(Date.now() + 32 * 3600 * 1000).toISOString();
    render(
      <RecipientCard
        item={makeItem({ status: "cooldown", cooldown_until: cooldownIso })}
        defaultExpanded
      />,
    );
    expect(screen.getByText(/was contacted from this platform/)).toBeInTheDocument();
    expect(screen.getByText(/Available to reach in/)).toBeInTheDocument();
  });

  it("collapses sent state to one-line summary", () => {
    const item = makeItem({
      status: "sent",
      sent_at: "2026-05-05T09:42:00Z",
    });
    render(<RecipientCard item={item} />);
    expect(screen.getByText(/Sent to Sarah Chen at/)).toBeInTheDocument();
    // No subject/body in collapsed state
    expect(screen.queryByText("Quick intro")).not.toBeInTheDocument();
  });

  it.each<TodayCardStatus>(["ready", "skipped", "held", "default"])(
    "renders status %s pill",
    (status) => {
      render(<RecipientCard item={makeItem({ status })} />);
      const labelMap: Record<TodayCardStatus, string> = {
        default: "Default",
        ready: "Ready",
        skipped: "Skipped",
        sent: "Sent",
        cooldown: "Cooldown",
        held: "Held",
        failed: "Failed",
        replied: "Replied",
      };
      expect(screen.getByLabelText(`Status: ${labelMap[status]}`)).toBeInTheDocument();
    },
  );
});

describe("<TodayEmptyState />", () => {
  it("renders no-batch-yet with locked microcopy", () => {
    render(<TodayEmptyState variant="no-batch-yet" />);
    expect(screen.getByText("Your first batch is being matched.")).toBeInTheDocument();
    expect(screen.getByText("You'll see it within a week of approval.")).toBeInTheDocument();
  });

  it("renders no-matches with Adjust preferences + Skip today", () => {
    const onSkip = vi.fn();
    render(<TodayEmptyState variant="no-matches" onSkipToday={onSkip} />);
    expect(screen.getByText("Nothing fresh today.")).toBeInTheDocument();
    expect(screen.getByText(/Want to widen the net/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adjust preferences" })).toHaveAttribute(
      "href",
      "/preferences",
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip today" }));
    expect(onSkip).toHaveBeenCalled();
  });

  it("renders limit-reached-free copy", () => {
    render(<TodayEmptyState variant="limit-reached-free" />);
    expect(screen.getByText("That's your 7 for today. See you tomorrow.")).toBeInTheDocument();
    expect(screen.getByText(/Next batch unlocks at 6:00 AM/)).toBeInTheDocument();
  });

  it("renders limit-reached-paid copy", () => {
    render(<TodayEmptyState variant="limit-reached-paid" />);
    expect(screen.getByText("That's your 20 for today. See you tomorrow.")).toBeInTheDocument();
  });
});
