import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("proxyRequest", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("forwards Authorization header verbatim and returns upstream body+status", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { id: "u1" }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/auth/me", {
      method: "GET",
      headers: { Authorization: "Bearer tok-abc" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/auth/me" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/auth/me");
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.get("Authorization")).toBe("Bearer tok-abc");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "u1" });
  });

  it("returns 502 with locked envelope when upstream fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    const req = new Request("http://app.local/api/auth/me", { method: "GET" });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/auth/me" });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_unavailable");
    expect(body.error.message).toBe("We hit a snag.");
  });

  it("returns 503 when BACKEND_URL is missing", async () => {
    delete process.env.BACKEND_URL;
    const req = new Request("http://app.local/api/auth/me", { method: "GET" });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/auth/me" });
    expect(res.status).toBe(503);
  });

  it("forwards POST body bytes through", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/onboarding/claim-waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
      body: JSON.stringify({ email: "a@b.co" }),
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/onboarding/claim-waitlist" });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    // ArrayBuffer body containing the JSON
    const bodyBuf = init.body as ArrayBuffer;
    expect(bodyBuf).toBeDefined();
    const decoded = new TextDecoder().decode(bodyBuf);
    expect(JSON.parse(decoded)).toEqual({ email: "a@b.co" });
  });
});
