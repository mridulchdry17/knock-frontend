import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("F.6 templates proxy routes", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("GET /api/templates forwards Authorization + 200 body", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], count: 0, cap: 3 }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/templates", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/templates" });

    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/templates");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer t");
    expect(res.status).toBe(200);
  });

  it("POST /api/templates forwards JSON body bytes", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { id: "tpl-1" }));
    vi.stubGlobal("fetch", fetchSpy);

    const body = JSON.stringify({ name: "X", subject: "S", body: "<p>B</p>" });
    const req = new Request("http://app.local/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
      body,
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/templates" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const decoded = new TextDecoder().decode(init.body as ArrayBuffer);
    expect(JSON.parse(decoded)).toEqual({ name: "X", subject: "S", body: "<p>B</p>" });
    expect(init.method).toBe("POST");
  });

  it("PATCH /api/templates/{id} forwards path + body", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { id: "tpl-1" }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/templates/tpl-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
      body: JSON.stringify({ subject: "New" }),
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/templates/tpl-1" });
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/templates/tpl-1");
  });

  it("DELETE /api/templates/{id} forwards method and path", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/templates/tpl-1", {
      method: "DELETE",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, { upstreamPath: "/api/v1/templates/tpl-1" });
    expect(res.status).toBe(200);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("DELETE");
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/templates/tpl-1");
  });

  it("test-send returns 502 envelope on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const req = new Request("http://app.local/api/templates/tpl-1/test-send", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await proxyRequest(req, {
      upstreamPath: "/api/v1/templates/tpl-1/test-send",
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_unavailable");
  });
});
