import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { updateCard, sendBatch, skipToday } from "@/lib/today/mutations";
import { pauseAutopilot, resumeAutopilot } from "@/lib/autopilot/client";
import { ApiError } from "@/lib/api/errors";
import { __resetTokenForTests, setToken } from "@/lib/auth/token";

const ORIGINAL_ENV = { ...process.env };

function mockResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseItem = {
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

describe("F.5b mutation clients", () => {
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

  it("updateCard PATCHes and Zod-parses the response", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { ...baseItem, status: "ready" }));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await updateCard("c1", { status: "ready" });
    expect(result.id).toBe("c1");
    expect(result.status).toBe("ready");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ status: "ready" }));
  });

  it("updateCard surfaces 404 ApiError on card_not_found", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResponse(404, { error: { code: "card_not_found", message: "not found" } }),
        ),
    );
    await expect(updateCard("c1", { status: "ready" })).rejects.toBeInstanceOf(ApiError);
  });

  it("sendBatch parses dispatch result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(200, {
          dispatched_count: 3,
          scheduled_first_at: "2026-05-05T09:42:00Z",
          scheduled_last_at: "2026-05-05T09:50:00Z",
        }),
      ),
    );
    const res = await sendBatch();
    expect(res.dispatched_count).toBe(3);
  });

  it("sendBatch rejects on 503 gmail_disconnected", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResponse(503, { error: { code: "gmail_disconnected", message: "x" } }),
        ),
    );
    await expect(sendBatch()).rejects.toMatchObject({
      status: 503,
      code: "gmail_disconnected",
    });
  });

  it("skipToday parses {skipped:true}", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(200, { skipped: true })),
    );
    const res = await skipToday();
    expect(res.skipped).toBe(true);
  });

  it("pauseAutopilot parses paused result", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResponse(200, { paused: true, paused_at: "2026-05-05T10:00:00Z" }),
        ),
    );
    const res = await pauseAutopilot();
    expect(res.paused).toBe(true);
    expect(res.paused_at).toBe("2026-05-05T10:00:00Z");
  });

  it("resumeAutopilot parses paused:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(200, { paused: false })),
    );
    const res = await resumeAutopilot();
    expect(res.paused).toBe(false);
  });

  it("502 from any mutation surfaces ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockResponse(502, { error: { code: "upstream_unavailable", message: "We hit a snag." } }),
      ),
    );
    await expect(updateCard("c1", { status: "ready" })).rejects.toBeInstanceOf(ApiError);
  });
});
