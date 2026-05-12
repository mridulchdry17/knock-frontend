import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Tiptap doesn't mount cleanly in jsdom — stub the lazy composer.
vi.mock("@/components/knock/reply-composer", () => ({
  ReplyComposer: ({
    onSend,
    initialBody,
  }: {
    onSend: (b: string) => Promise<void>;
    initialBody?: string;
  }) => (
    <div data-testid="reply-composer-stub">
      <span data-testid="composer-initial">{initialBody ?? ""}</span>
      <button
        type="button"
        data-testid="composer-send"
        onClick={() => {
          // Swallow rejection — the real composer surfaces it as a snag banner;
          // the stub mirrors that "no unhandled rejection bubble" contract.
          onSend("<p>hello</p>").catch(() => {});
        }}
      >
        send
      </button>
    </div>
  ),
}));

import { ThreadDetail } from "@/components/knock/thread-detail";
import type { ThreadDetail as ThreadDetailType } from "@/lib/inbox/types";

function thread(over: Partial<ThreadDetailType> = {}): ThreadDetailType {
  return {
    id: "th-1",
    subject: "Re: Hi",
    category: "reply",
    sender: {
      name: "Sarah",
      email: "sarah@acme.com",
      role: "Recruiter",
      company: "Acme",
    },
    messages: [
      {
        id: "m1",
        direction: "outbound",
        from: { name: "Me", email: "me@x.com" },
        body_html: "<p>Outbound msg</p>",
        sent_at: "2026-05-01T00:00:00Z",
      },
      {
        id: "m2",
        direction: "inbound",
        from: { name: "Sarah", email: "sarah@acme.com" },
        body_html: "<p>Inbound reply</p>",
        sent_at: "2026-05-01T01:00:00Z",
      },
    ],
    suggested_followup: null,
    ...over,
  };
}

describe("<ThreadDetail>", () => {
  it("renders sender + role/company subtitle and both messages", () => {
    render(
      <ThreadDetail
        thread={thread()}
        onSendReply={vi.fn()}
        onMarkDone={vi.fn().mockResolvedValue(undefined)}
        appendOptimistic={vi.fn()}
        rollbackOptimistic={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Sarah").length).toBeGreaterThan(0);
    expect(screen.getByText("Recruiter · Acme")).toBeInTheDocument();
    expect(screen.getByText("Outbound msg")).toBeInTheDocument();
    expect(screen.getByText("Inbound reply")).toBeInTheDocument();
  });

  it("does not render suggested-followup card when null", () => {
    render(
      <ThreadDetail
        thread={thread()}
        onSendReply={vi.fn()}
        onMarkDone={vi.fn().mockResolvedValue(undefined)}
        appendOptimistic={vi.fn()}
        rollbackOptimistic={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("suggested-followup")).toBeNull();
  });

  it("renders suggested-followup card with locked microcopy and three buttons", () => {
    render(
      <ThreadDetail
        thread={thread({
          suggested_followup: {
            subject: "S",
            body_html: "<p>draft</p>",
            reason: "5 days since you emailed",
          },
        })}
        onSendReply={vi.fn()}
        onMarkDone={vi.fn().mockResolvedValue(undefined)}
        appendOptimistic={vi.fn()}
        rollbackOptimistic={vi.fn()}
      />,
    );
    const card = screen.getByTestId("suggested-followup");
    expect(card).toHaveTextContent(
      "Knock drafted a gentle follow-up for day 5. Edit, send, or skip.",
    );
    expect(screen.getByRole("button", { name: "Edit & send" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send as-is" })).toBeInTheDocument();
  });

  it("optimistic append + rollback on send failure", async () => {
    const append = vi.fn();
    const rollback = vi.fn();
    const onSend = vi.fn().mockRejectedValue(new Error("boom"));
    render(
      <ThreadDetail
        thread={thread()}
        onSendReply={onSend}
        onMarkDone={vi.fn().mockResolvedValue(undefined)}
        appendOptimistic={append}
        rollbackOptimistic={rollback}
      />,
    );
    fireEvent.click(screen.getByTestId("composer-send"));
    await waitFor(() => expect(append).toHaveBeenCalled());
    await waitFor(() => expect(rollback).toHaveBeenCalled());
  });

  it("Mark done calls onMarkDone", async () => {
    const onMarkDone = vi.fn().mockResolvedValue(undefined);
    render(
      <ThreadDetail
        thread={thread()}
        onSendReply={vi.fn()}
        onMarkDone={onMarkDone}
        appendOptimistic={vi.fn()}
        rollbackOptimistic={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("mark-done-btn"));
    await waitFor(() => expect(onMarkDone).toHaveBeenCalled());
  });

  it("Edit & send pre-fills the composer with the suggested body", async () => {
    render(
      <ThreadDetail
        thread={thread({
          suggested_followup: {
            subject: "S",
            body_html: "<p>SUGGESTED</p>",
            reason: "5 days since you emailed",
          },
        })}
        onSendReply={vi.fn()}
        onMarkDone={vi.fn().mockResolvedValue(undefined)}
        appendOptimistic={vi.fn()}
        rollbackOptimistic={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit & send" }));
    await waitFor(() =>
      expect(screen.getByTestId("composer-initial")).toHaveTextContent(
        "<p>SUGGESTED</p>",
      ),
    );
  });
});
