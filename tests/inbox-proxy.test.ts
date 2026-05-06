import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("F.7 inbox proxy routes", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("GET /api/inbox forwards Authorization + query string", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { items: [], total: 0, unread_count: 0 }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/inbox?category=replies", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, {
      upstreamPath: "/api/v1/inbox",
      forwardQuery: true,
    });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "http://backend.test/api/v1/inbox?category=replies",
    );
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer t");
    expect(res.status).toBe(200);
  });

  it("GET /api/inbox/{id} forwards path", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/inbox/th-1", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/inbox/th-1" });
    expect(fetchSpy.mock.calls[0][0]).toBe("http://backend.test/api/v1/inbox/th-1");
  });

  it("POST /api/inbox/{id}/read forwards method", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/inbox/th-1/read", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/inbox/th-1/read" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "http://backend.test/api/v1/inbox/th-1/read",
    );
  });

  it("POST /api/inbox/{id}/reply forwards JSON body bytes", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ok: true, message_id: "m-9" }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/inbox/th-1/reply", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: JSON.stringify({ body_html: "<p>Hi</p>" }),
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/inbox/th-1/reply" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const decoded = new TextDecoder().decode(init.body as ArrayBuffer);
    expect(JSON.parse(decoded)).toEqual({ body_html: "<p>Hi</p>" });
  });

  it("POST /api/inbox/{id}/done forwards path", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);
    const req = new Request("http://app.local/api/inbox/th-1/done", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{}",
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/inbox/th-1/done" });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      "http://backend.test/api/v1/inbox/th-1/done",
    );
  });

  it("GET /api/inbox/sync-status maps 502 envelope on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const req = new Request("http://app.local/api/inbox/sync-status", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, {
      upstreamPath: "/api/v1/inbox/sync-status",
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_unavailable");
  });
});
