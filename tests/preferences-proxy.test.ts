import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("F.8 preferences proxy routes", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("GET /api/preferences forwards Authorization + 200 body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/preferences", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/preferences" });
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/preferences");
    expect(res.status).toBe(200);
  });

  it("PATCH /api/preferences forwards body bytes", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);
    const body = JSON.stringify({ target_role: "Recruiter" });
    const req = new Request("http://app.local/api/preferences", {
      method: "PATCH",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body,
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/preferences" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
    const decoded = new TextDecoder().decode(init.body as ArrayBuffer);
    expect(JSON.parse(decoded)).toEqual({ target_role: "Recruiter" });
  });

  it("POST /api/preferences/excluded-domains forwards path + body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(201, { domain: "x.com" }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/preferences/excluded-domains", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "x.com" }),
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/preferences/excluded-domains" });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "http://backend.test/api/v1/preferences/excluded-domains",
    );
  });

  it("DELETE /api/preferences/excluded-domains/{domain} forwards path", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/preferences/excluded-domains/spam.example", {
      method: "DELETE",
      headers: { Authorization: "Bearer t" },
    });
    await proxyRequest(req, {
      upstreamPath: "/api/v1/preferences/excluded-domains/spam.example",
    });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "http://backend.test/api/v1/preferences/excluded-domains/spam.example",
    );
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("DELETE");
  });

  it("POST /api/autopilot/enable forwards method + 502 envelope on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const req = new Request("http://app.local/api/autopilot/enable", {
      method: "POST",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/autopilot/enable" });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_unavailable");
  });

  it("POST /api/autopilot/disable forwards method", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { autopilot_enabled: false }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/autopilot/disable", {
      method: "POST",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/autopilot/disable" });
    expect(res.status).toBe(200);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
  });
});
