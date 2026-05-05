import { describe, it, expect, beforeEach, vi } from "vitest";
import { listUsers, suspendUser, updateTier } from "@/lib/admin/users";
import { listWaitlist } from "@/lib/admin/waitlist";
import { ApiError } from "@/lib/api/errors";
import { __resetTokenForTests, setToken } from "@/lib/auth/token";

function mockResponse(status: number, body: unknown): Response {
  const text = body === undefined ? "" : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleUser = {
  id: 7,
  email: "user@example.com",
  full_name: "User Example",
  tier: "pending",
  waitlist_email: null,
  is_suspended: false,
  has_gmail_connected: false,
  created_at: "2025-01-01T00:00:00Z",
  tier_set_at: null,
};

describe("admin client", () => {
  beforeEach(() => {
    __resetTokenForTests();
    setToken("admin-tok");
    vi.restoreAllMocks();
  });

  it("listUsers parses Page<AdminUserOut> and forwards query params", async () => {
    const page = { items: [sampleUser], total: 1, limit: 50, offset: 0 };
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse(200, page));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await listUsers({ tier: "pending", search: "foo", limit: 50, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("7"); // coerced to string
    expect(result.items[0].email).toBe("user@example.com");

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("/api/admin/users?");
    expect(url).toContain("tier=pending");
    expect(url).toContain("search=foo");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=0");
  });

  it("listUsers omits empty params from query string", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { items: [], total: 0, limit: 50, offset: 0 }));
    vi.stubGlobal("fetch", fetchSpy);

    await listUsers({});
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("/api/admin/users");
  });

  it("updateTier PATCHes with the right body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse(200, { ...sampleUser, tier: "free" }));
    vi.stubGlobal("fetch", fetchSpy);

    const out = await updateTier("7", "free");
    expect(out.tier).toBe("free");

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/users/7/tier");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ tier: "free" });
  });

  it("suspendUser forwards the reason in the body", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { ...sampleUser, is_suspended: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await suspendUser("7", "spam");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ reason: "spam" });
  });

  it("suspendUser sends no body when reason is omitted", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { ...sampleUser, is_suspended: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await suspendUser("7");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("normalizes error envelope from upstream", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(404, { error: { code: "not_found", message: "Gone." } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(updateTier("99", "free")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });

  it("listWaitlist parses Page<AdminWaitlistOut>", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(200, {
        items: [{ id: 1, email: "wl@example.com", created_at: "2025-01-02T00:00:00Z" }],
        total: 1,
        limit: 50,
        offset: 0,
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const out = await listWaitlist({ limit: 50, offset: 0 });
    expect(out.items[0].email).toBe("wl@example.com");
    expect(out.items[0].id).toBe("1");
  });
});

describe("ApiError shape", () => {
  it("ApiError exposes status + code", () => {
    const err = new ApiError(404, "not_found", "x");
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
  });
});
