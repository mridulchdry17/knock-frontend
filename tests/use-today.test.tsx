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

const baseBatch = {
  generated_at: "2026-05-05T06:00:00Z",
  date: "2026-05-05",
  cap: 7,
  sent_today: 0,
  items: [] as unknown[],
};

const sampleItem = {
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
  status: "ready",
  cooldown_until: null,
  sent_at: null,
};

describe("useToday()", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES;
    __resetTokenForTests();
    setToken("tok");
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("transitions loading → no-batch-yet on 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(502, { error: { code: "upstream_unavailable", message: "x" } }),
      ),
    );
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("no-batch-yet"));
  });

  it("transitions to no-matches on 200 with empty items", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, { ...baseBatch, items: [] })));
    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("no-matches"));
  });

  it("transitions to limit-reached when sent_today >= cap with items", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(mockResponse(200, { ...baseBatch, sent_today: 7, items: [sampleItem] })),
    );
    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("limit-reached"));
  });

  it("transitions to populated when items present and under cap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(200, { ...baseBatch, items: [sampleItem] })),
    );
    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("populated"));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("surfaces ApiError on 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(500, { error: { code: "internal", message: "Boom" } })),
    );
    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.status).toBe(500);
  });

  it("retry() refetches", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse(502, { error: { code: "upstream_unavailable", message: "x" } }),
      )
      .mockResolvedValueOnce(mockResponse(200, { ...baseBatch, items: [sampleItem] }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useToday());
    await waitFor(() => expect(result.current.status).toBe("no-batch-yet"));

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe("populated"));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
