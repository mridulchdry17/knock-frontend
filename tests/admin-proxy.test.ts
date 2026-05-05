import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { proxyRequest } from "@/lib/api/proxy";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("proxyRequest — admin extensions", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKEND_URL: "http://backend.test" };
    vi.restoreAllMocks();
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("forwards search params when forwardQuery is true", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0, limit: 50, offset: 0 }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request(
      "http://app.local/api/admin/users?tier=pending&search=foo&limit=20&offset=40",
      { method: "GET", headers: { Authorization: "Bearer tok" } },
    );
    await proxyRequest(req, { upstreamPath: "/api/v1/admin/users", forwardQuery: true });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("http://backend.test/api/v1/admin/users?tier=pending&search=foo&limit=20&offset=40");
  });

  it("does not append a trailing ? when query is empty", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/admin/users", { method: "GET" });
    await proxyRequest(req, { upstreamPath: "/api/v1/admin/users", forwardQuery: true });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("http://backend.test/api/v1/admin/users");
  });

  it("forwards Authorization for admin endpoints", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/admin/users/42/suspend", {
      method: "POST",
      headers: { Authorization: "Bearer admin-tok", "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "spam" }),
    });
    await proxyRequest(req, { upstreamPath: "/api/v1/admin/users/42/suspend" });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer admin-tok");
    const decoded = new TextDecoder().decode(init.body as ArrayBuffer);
    expect(JSON.parse(decoded)).toEqual({ reason: "spam" });
  });

  it("streams body and forwards Content-Disposition when stream=true", async () => {
    const upstream = new Response("email,joined\nfoo@x.co,2025-01-01\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="waitlist.csv"',
      },
    });
    const fetchSpy = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchSpy);

    const req = new Request("http://app.local/api/admin/waitlist.csv", {
      method: "GET",
      headers: { Authorization: "Bearer t" },
    });
    const res = await proxyRequest(req, {
      upstreamPath: "/api/v1/admin/waitlist.csv",
      stream: true,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="waitlist.csv"');
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("foo@x.co");
  });
});
