import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiFetch, toProxyPath } from "@/lib/api/client";
import { __resetTokenForTests } from "@/lib/auth/token";

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toProxyPath", () => {
  it("maps /api/v1/<rest> → /api/<rest>", () => {
    expect(toProxyPath("/api/v1/auth/me")).toBe("/api/auth/me");
    expect(toProxyPath("/api/v1/onboarding/status")).toBe("/api/onboarding/status");
    expect(toProxyPath("/api/v1/onboarding/claim-waitlist")).toBe("/api/onboarding/claim-waitlist");
  });

  it("passes other paths through unchanged", () => {
    expect(toProxyPath("/api/waitlist")).toBe("/api/waitlist");
    expect(toProxyPath("/health")).toBe("/health");
  });
});

describe("apiFetch — same-origin proxy mapping", () => {
  beforeEach(() => {
    __resetTokenForTests();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("rewrites /api/v1/* to /api/* before calling fetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await apiFetch("/api/v1/auth/me", { auth: false });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/auth/me");
  });
});
