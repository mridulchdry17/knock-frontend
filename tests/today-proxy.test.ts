import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/today proxy", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("forwards Authorization header verbatim", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/today", {
      method: "GET",
      headers: { Authorization: "Bearer tok" },
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/today" });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/today");
  });

  it("returns 502 envelope when upstream throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const req = new Request("http://app.local/api/today", { method: "GET" });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/today" });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "upstream_unavailable", message: "We hit a snag." } });
  });

  it("returns body verbatim with upstream status on 200", async () => {
    const payload = {
      generated_at: "2026-05-05T06:00:00Z",
      date: "2026-05-05",
      cap: 7,
      sent_today: 0,
      items: [],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, payload)));

    const req = new Request("http://app.local/api/today", { method: "GET" });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/today" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(payload);
  });
});
