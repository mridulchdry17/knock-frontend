import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api/client";
import {
  fetchInboxList,
  fetchSyncStatus,
  fetchThread,
  markThreadDone,
  markThreadRead,
  sendReply,
} from "@/lib/inbox/client";
import { __resetInboxFixturesForTests } from "@/lib/inbox/fixtures";

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>;
const ORIGINAL_ENV = { ...process.env };

function setFixtureMode(on: boolean) {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_USE_TODAY_FIXTURES: on ? "true" : "false",
  };
}

describe("inbox client (live mode)", () => {
  beforeEach(() => {
    setFixtureMode(false);
    apiFetchMock.mockReset();
  });

  it("fetchInboxList parses 200 list response", async () => {
    apiFetchMock.mockResolvedValueOnce({
      items: [
        {
          id: "th-1",
          category: "reply",
          subject: "Re: Hi",
          sender: { name: "Sarah", email: "sarah@acme.com" },
          snippet: "Hello there",
          last_message_at: "2026-05-01T00:00:00Z",
          unread: true,
          message_count: 2,
        },
      ],
      total: 1,
      unread_count: 1,
    });
    const res = await fetchInboxList("replies");
    expect(res.kind).toBe("list");
    if (res.kind === "list") {
      expect(res.data.items[0].category).toBe("reply");
      expect(res.data.unread_count).toBe(1);
    }
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/inbox?category=reply");
  });

  it("fetchInboxList omits ?category for 'all' tab", async () => {
    apiFetchMock.mockResolvedValueOnce({ items: [], total: 0, unread_count: 0 });
    await fetchInboxList("all");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/inbox");
  });

  it("fetchInboxList maps 502 to unavailable", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(502, "upstream_unavailable", "We hit a snag."),
    );
    const res = await fetchInboxList("all");
    expect(res.kind).toBe("unavailable");
  });

  it("fetchInboxList maps other ApiError to error", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError(500, "server", "Boom."));
    const res = await fetchInboxList("all");
    expect(res.kind).toBe("error");
  });

  it("fetchThread parses thread detail", async () => {
    apiFetchMock.mockResolvedValueOnce({
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
          body_html: "<p>Hi</p>",
          sent_at: "2026-05-01T00:00:00Z",
        },
      ],
      suggested_followup: null,
    });
    const res = await fetchThread("th-1");
    expect(res.kind).toBe("thread");
    if (res.kind === "thread") {
      expect(res.data.messages[0].direction).toBe("outbound");
    }
  });

  it("markThreadRead POSTs the right path", async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);
    await markThreadRead("th-1");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/inbox/th-1/read", {
      method: "POST",
      body: {},
    });
  });

  it("sendReply POSTs body_html and parses response", async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true, message_id: "m-9" });
    const res = await sendReply("th-1", "<p>Reply</p>");
    expect(res.message_id).toBe("m-9");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/inbox/th-1/reply", {
      method: "POST",
      body: { body_html: "<p>Reply</p>" },
    });
  });

  it("markThreadDone POSTs the right path", async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);
    await markThreadDone("th-1");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/inbox/th-1/done", {
      method: "POST",
      body: {},
    });
  });

  it("fetchSyncStatus 502 graceful-fails to unhealthy", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(502, "upstream_unavailable", "snag"),
    );
    const res = await fetchSyncStatus();
    expect(res.healthy).toBe(false);
    expect(res.last_synced_at).toBeNull();
  });
});

describe("inbox client (fixture mode)", () => {
  beforeEach(() => {
    setFixtureMode(true);
    apiFetchMock.mockReset();
    __resetInboxFixturesForTests();
  });

  it("returns 5 deterministic threads on 'all'", async () => {
    const res = await fetchInboxList("all");
    expect(res.kind).toBe("list");
    if (res.kind === "list") {
      expect(res.data.items.length).toBe(5);
      expect(res.data.unread_count).toBeGreaterThan(0);
    }
  });

  it("filters by tab category", async () => {
    const replies = await fetchInboxList("replies");
    if (replies.kind !== "list") throw new Error("expected list");
    expect(replies.data.items.every((i) => i.category === "reply")).toBe(true);
    const bounces = await fetchInboxList("bounces");
    if (bounces.kind !== "list") throw new Error("expected list");
    expect(bounces.data.items.every((i) => i.category === "bounce")).toBe(true);
  });

  it("markRead clears unread on the matching item", async () => {
    const before = await fetchInboxList("all");
    if (before.kind !== "list") throw new Error("expected list");
    const target = before.data.items.find((i) => i.unread);
    if (!target) throw new Error("expected an unread fixture");
    await markThreadRead(target.id);
    const after = await fetchInboxList("all");
    if (after.kind !== "list") throw new Error("expected list");
    const updated = after.data.items.find((i) => i.id === target.id);
    expect(updated?.unread).toBe(false);
  });

  it("sendReply appends an outbound message to the thread", async () => {
    const list = await fetchInboxList("all");
    if (list.kind !== "list") throw new Error("expected list");
    const id = list.data.items[0].id;
    const before = await fetchThread(id);
    if (before.kind !== "thread") throw new Error("expected thread");
    const beforeCount = before.data.messages.length;
    const res = await sendReply(id, "<p>Hello back</p>");
    expect(res.ok).toBe(true);
    const after = await fetchThread(id);
    if (after.kind !== "thread") throw new Error("expected thread");
    expect(after.data.messages.length).toBe(beforeCount + 1);
    expect(after.data.messages.at(-1)?.direction).toBe("outbound");
  });

  it("markDone removes from the active list", async () => {
    const before = await fetchInboxList("all");
    if (before.kind !== "list") throw new Error("expected list");
    const id = before.data.items[0].id;
    await markThreadDone(id);
    const after = await fetchInboxList("all");
    if (after.kind !== "list") throw new Error("expected list");
    expect(after.data.items.find((i) => i.id === id)).toBeUndefined();
  });
});
