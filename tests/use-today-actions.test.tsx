import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useToday } from "@/lib/today/use-today";
import { __resetTokenForTests, setToken } from "@/lib/auth/token";

const ORIGINAL_ENV = { ...process.env };

function mockResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleItem = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  recipient: {
    name: "Sarah",
    email: "s@x.co",
    role: "R",
    company: "Stripe",
    company_domain: "stripe.com",
    linkedin_url: null,
  },
  template_id: "t1",
  template_name: "Recruiter intro",
  subject: "Hi",
  body_preview: "Hi",
  body: "Hi",
  send_time: "2026-05-05T09:42:00Z",
  status: "default",
  cooldown_until: null,
  sent_at: null,
  ...overrides,
});

const batchWith = (items: ReturnType<typeof sampleItem>[]) => ({
  generated_at: "2026-05-05T06:00:00Z",
  date: "2026-05-05",
  cap: 7,
  sent_today: 0,
  items,
});

describe("useToday — F.5b optimistic mutations", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES;
    __resetTokenForTests();
    setToken("tok");
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
  });

  it("markReady optimistically updates and surfaces on server success", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, batchWith([sampleItem()])))
      .mockResolvedValueOnce(mockResponse(200, sampleItem({ status: "ready" })));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    await act(async () => {
      await result.current.markReady("c1");
    });
    expect(result.current.data?.items[0].status).toBe("ready");
    expect(result.current.readyCount).toBe(1);
  });

  it("markReady rolls back on server failure", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, batchWith([sampleItem()])))
      .mockResolvedValueOnce(
        mockResponse(500, { error: { code: "internal", message: "boom" } }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    await act(async () => {
      await result.current.markReady("c1").catch(() => undefined);
    });
    // Rolled back to default.
    await waitFor(() =>
      expect(result.current.data?.items[0].status).toBe("default"),
    );
  });

  it("editCard sends patch and replaces card with server canonical", async () => {
    const updated = sampleItem({ subject: "New subject", status: "ready" });
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, batchWith([sampleItem()])))
      .mockResolvedValueOnce(mockResponse(200, updated));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    await act(async () => {
      await result.current.editCard("c1", { subject: "New subject", body: "Body" });
    });
    expect(result.current.data?.items[0].subject).toBe("New subject");
    // Auto-marks ready per spec.
    const sentBody = (fetchSpy.mock.calls[1][1] as RequestInit).body as string;
    expect(JSON.parse(sentBody).status).toBe("ready");
  });

  it("beginSend cancels before 3s, no API call fires", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, batchWith([sampleItem({ status: "ready" })])));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await vi.waitFor(() => expect(result.current.status).toBe("populated"));

    let handle: ReturnType<typeof result.current.beginSend> | null = null;
    act(() => {
      handle = result.current.beginSend();
    });
    expect(result.current.sendPhase).toBe("holding");
    act(() => {
      handle?.cancel();
    });
    expect(result.current.sendPhase).toBe("idle");
    // Advance 3s — no API call should fire because cancelled.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // only the initial GET
  });

  it("beginSend fires API after 3s and transitions cards to sent", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, batchWith([sampleItem({ status: "ready" })])))
      .mockResolvedValueOnce(
        mockResponse(200, {
          dispatched_count: 1,
          scheduled_first_at: "2026-05-05T09:42:00Z",
          scheduled_last_at: "2026-05-05T09:42:00Z",
        }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await vi.waitFor(() => expect(result.current.status).toBe("populated"));

    act(() => {
      result.current.beginSend();
    });
    await act(async () => {
      vi.advanceTimersByTime(3001);
    });
    await vi.waitFor(() => expect(result.current.sendPhase).toBe("dispatched"));
    expect(result.current.data?.items[0].status).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("skipBatch flips remaining items to skipped and limit-reached status", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(200, batchWith([sampleItem()])))
      .mockResolvedValueOnce(mockResponse(200, { skipped: true }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    await act(async () => {
      await result.current.skipBatch();
    });
    expect(result.current.status).toBe("limit-reached");
    expect(result.current.data?.items[0].status).toBe("skipped");
  });
});
