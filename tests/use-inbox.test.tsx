import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/inbox/client", () => ({
  fetchInboxList: vi.fn(),
  fetchThread: vi.fn(),
  fetchSyncStatus: vi.fn(),
  markThreadRead: vi.fn(),
  sendReply: vi.fn(),
  markThreadDone: vi.fn(),
}));

import {
  fetchInboxList,
  fetchSyncStatus,
  markThreadDone,
  markThreadRead,
  sendReply,
} from "@/lib/inbox/client";
import { useInbox } from "@/lib/inbox/use-inbox";
import type { InboxItem } from "@/lib/inbox/types";

const fetchListMock = fetchInboxList as unknown as ReturnType<typeof vi.fn>;
const fetchSyncMock = fetchSyncStatus as unknown as ReturnType<typeof vi.fn>;
const markReadMock = markThreadRead as unknown as ReturnType<typeof vi.fn>;
const sendReplyMock = sendReply as unknown as ReturnType<typeof vi.fn>;
const markDoneMock = markThreadDone as unknown as ReturnType<typeof vi.fn>;

function item(over: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "th-1",
    category: "reply",
    subject: "Re: Hi",
    sender: { name: "Sarah", email: "sarah@acme.com" },
    snippet: "Hello",
    last_message_at: "2026-05-01T00:00:00Z",
    unread: true,
    message_count: 2,
    ...over,
  };
}

describe("useInbox", () => {
  beforeEach(() => {
    fetchListMock.mockReset();
    fetchSyncMock.mockReset();
    markReadMock.mockReset();
    sendReplyMock.mockReset();
    markDoneMock.mockReset();
    fetchSyncMock.mockResolvedValue({ healthy: true, last_synced_at: null });
  });

  it("loads list + populates status", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [item()], total: 1, unread_count: 1 },
    });
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    expect(result.current.unreadCount).toBe(1);
  });

  it("502 unavailable maps to empty status (calm All caught up)", async () => {
    fetchListMock.mockResolvedValueOnce({ kind: "unavailable" });
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("changing tab refetches", async () => {
    fetchListMock
      .mockResolvedValueOnce({
        kind: "list",
        data: { items: [item()], total: 1, unread_count: 1 },
      })
      .mockResolvedValueOnce({
        kind: "list",
        data: { items: [], total: 0, unread_count: 0 },
      });
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    act(() => result.current.setTab("bounces"));
    await waitFor(() => expect(result.current.tab).toBe("bounces"));
    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(fetchListMock).toHaveBeenCalledTimes(2);
  });

  it("markRead clears unread optimistically + decrements unreadCount", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [item()], total: 1, unread_count: 1 },
    });
    markReadMock.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    await act(async () => {
      await result.current.mutations.markRead("th-1");
    });
    expect(result.current.items[0].unread).toBe(false);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markRead rolls back on failure", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [item()], total: 1, unread_count: 1 },
    });
    markReadMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    await act(async () => {
      await result.current.mutations.markRead("th-1").catch(() => {});
    });
    expect(result.current.items[0].unread).toBe(true);
    expect(result.current.unreadCount).toBe(1);
  });

  it("markDone removes the item + drops unreadCount when item was unread", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: {
        items: [item({ id: "a", unread: true }), item({ id: "b", unread: false })],
        total: 2,
        unread_count: 1,
      },
    });
    markDoneMock.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.items.length).toBe(2));
    await act(async () => {
      await result.current.mutations.markDone("a");
    });
    expect(result.current.items.find((i) => i.id === "a")).toBeUndefined();
    expect(result.current.unreadCount).toBe(0);
  });

  it("markDone rolls back on failure", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [item()], total: 1, unread_count: 1 },
    });
    markDoneMock.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.items.length).toBe(1));
    await act(async () => {
      await result.current.mutations.markDone("th-1").catch(() => {});
    });
    expect(result.current.items.length).toBe(1);
  });

  it("sendReply forwards bodyHtml", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [item()], total: 1, unread_count: 1 },
    });
    sendReplyMock.mockResolvedValueOnce({ ok: true, message_id: "m-99" });
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    let res: { ok: boolean; message_id: string } | undefined;
    await act(async () => {
      res = await result.current.mutations.sendReply("th-1", "<p>Hi</p>");
    });
    expect(res?.message_id).toBe("m-99");
    expect(sendReplyMock).toHaveBeenCalledWith("th-1", "<p>Hi</p>", undefined);
  });

  it("syncHealthy=false surfaces from sync-status fetch", async () => {
    fetchListMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [], total: 0, unread_count: 0 },
    });
    fetchSyncMock.mockReset();
    fetchSyncMock.mockResolvedValueOnce({ healthy: false, last_synced_at: null });
    const { result } = renderHook(() => useInbox());
    await waitFor(() => expect(result.current.syncHealthy).toBe(false));
  });
});
