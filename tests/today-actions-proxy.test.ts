import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("F.5b proxy routes", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("PATCH /api/today/items/{id} forwards body + auth verbatim", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { id: "x", subject: "ok" }));
    vi.stubGlobal("fetch", fetchSpy);

    const body = JSON.stringify({ status: "ready", subject: "Hello" });
    const req = new Request("http://app.local/api/today/items/abc", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer t",
        "Content-Type": "application/json",
      },
      body,
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/today/items/abc" });
    expect(res.status).toBe(200);
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/today/items/abc");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer t");
    expect(init.method).toBe("PATCH");
  });

  it("send-batch returns 502 envelope on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const req = new Request("http://app.local/api/today/send-batch", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/today/send-batch" });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "upstream_unavailable", message: "We hit a snag." },
    });
  });

  it("skip POST passes through 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { skipped: true })),
    );
    const req = new Request("http://app.local/api/today/skip", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/today/skip" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: true });
  });

  it("autopilot/pause forwards POST", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse(200, { paused: true, paused_at: "2026-05-05T10:00:00Z" }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/autopilot/pause", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/autopilot/pause" });
    expect(res.status).toBe(200);
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/autopilot/pause");
  });
});
