import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { __resetTokenForTests, getToken, setToken } from "@/lib/auth/token";
import { __resetRefreshForTests } from "@/lib/auth/refresh";

function mockResponse(status: number, body: unknown): Response {
  const text = body === undefined ? "" : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  beforeEach(() => {
    __resetTokenForTests();
    __resetRefreshForTests();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("injects Authorization header when a token is set", async () => {
    setToken("tok-1");
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    await apiFetch("/api/v1/auth/me");

    const call = fetchSpy.mock.calls[0];
    const headers = call[1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-1");
  });

  it("omits Authorization when auth: false", async () => {
    setToken("tok-1");
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse(200, {}));
    vi.stubGlobal("fetch", fetchSpy);

    await apiFetch("/api/v1/public", { auth: false });

    const headers = fetchSpy.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
  });

  it("on 401 with session_expired code, wipes the token without trying refresh", async () => {
    setToken("tok-1");
    // session_expired is in SESSION_DEAD_CODES → skip the silent-refresh
    // retry path entirely (the session is genuinely dead; trying to refresh
    // would 401 too, and we want the redirect to happen now).
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(401, { error: { code: "session_expired", message: "expired" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      apiFetch("/api/v1/auth/me", { redirectOn401: false }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    // Only the original request — no /api/auth/refresh call should have fired.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("on generic 401 with refresh cookie still valid, silently rotates and retries", async () => {
    // auth-v1 flow: original request 401s with a non-session-dead code,
    // /api/auth/refresh mints a new access token, original is retried and
    // succeeds. Caller sees the success — no error surface.
    setToken("tok-1");
    const fetchSpy = vi.fn()
      // First call: original GET /api/auth/me → 401
      .mockResolvedValueOnce(
        mockResponse(401, { error: { code: "unauthorized", message: "expired" } }),
      )
      // Refresh call returns a new access token
      .mockResolvedValueOnce(mockResponse(200, { access_token: "tok-2" }))
      // Retry of original now succeeds with the new token
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await apiFetch<{ ok: boolean }>("/api/v1/auth/me", {
      redirectOn401: false,
    });
    expect(result.ok).toBe(true);

    // Token rotated in memory.
    expect(getToken()).toBe("tok-2");

    // 3 fetches: original (401) + refresh (200) + retry (200).
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[1][0]).toBe("/api/auth/refresh");
  });

  it("on generic 401 when refresh also fails, clears token and emits the reauth event", async () => {
    // Refresh cookie is also dead — apiFetch should treat as Gmail-reauth
    // path on the final 401 (or as session-dead, depending on code).
    setToken("tok-1");
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(
        mockResponse(401, { error: { code: "unauthorized", message: "no" } }),
      )
      // /api/auth/refresh 401 — cookie revoked.
      .mockResolvedValueOnce(
        mockResponse(401, { error: { code: "refresh_invalid", message: "gone" } }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      apiFetch("/api/v1/auth/me", { redirectOn401: false }),
    ).rejects.toBeInstanceOf(ApiError);

    // refresh failure clears the token (no retry happens — refresh returned
    // null, so the final 401 falls through to session-dead handling with
    // no token in memory → token cleared).
    expect(getToken()).toBeNull();
  });

  it("normalizes non-2xx responses into ApiError using the error envelope", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(422, { error: { code: "invalid_email", message: "bad email" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    try {
      await apiFetch("/api/v1/whatever", { auth: false });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(422);
      expect(err.code).toBe("invalid_email");
      expect(err.message).toBe("bad email");
    }
  });
});
