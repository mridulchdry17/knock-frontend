import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchTodayBatch } from "@/lib/today/client";
import { __resetTokenForTests, setToken } from "@/lib/auth/token";

const ORIGINAL_ENV = { ...process.env };

function mockResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const validBatch = {
  generated_at: "2026-05-05T06:00:00Z",
  date: "2026-05-05",
  cap: 7,
  sent_today: 2,
  items: [
    {
      id: "c1",
      recipient: {
        name: "Sarah",
        email: "s@x.co",
        role: "Recruiter",
        company: "Stripe",
        company_domain: "stripe.com",
        linkedin_url: null,
      },
      template_id: "t1",
      template_name: "Recruiter intro",
      subject: "Hi",
      body_preview: "Hi Sarah",
      body: "Hi Sarah,\n\nFull body.",
      send_time: "2026-05-05T09:42:00Z",
      status: "ready",
      cooldown_until: null,
      sent_at: null,
    },
  ],
};

describe("fetchTodayBatch", () => {
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

  it("parses a 200 batch through Zod and returns kind=batch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, validBatch)));
    const result = await fetchTodayBatch();
    expect(result.kind).toBe("batch");
    if (result.kind === "batch") {
      expect(result.data.cap).toBe(7);
      expect(result.data.items).toHaveLength(1);
    }
  });

  it("maps 404 no_batch_yet to kind=no-batch-yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(404, { error: { code: "no_batch_yet", message: "Not yet." } }),
      ),
    );
    const result = await fetchTodayBatch();
    expect(result.kind).toBe("no-batch-yet");
  });

  it("maps 502 upstream_unavailable to kind=no-batch-yet (backend not built)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(502, { error: { code: "upstream_unavailable", message: "We hit a snag." } }),
      ),
    );
    const result = await fetchTodayBatch();
    expect(result.kind).toBe("no-batch-yet");
  });

  it("maps other 5xx to kind=error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(500, { error: { code: "internal", message: "Boom." } }),
      ),
    );
    const result = await fetchTodayBatch();
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.error.status).toBe(500);
  });

  it("returns deterministic fixture when NEXT_PUBLIC_USE_TODAY_FIXTURES=true", async () => {
    process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES = "true";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchTodayBatch();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.kind).toBe("batch");
    if (result.kind === "batch") {
      expect(result.data.items.length).toBeGreaterThan(0);
      expect(result.data.cap).toBe(7);
      // Deterministic ids
      expect(result.data.items[0].id).toBe("fx-1");
    }
  });
});
