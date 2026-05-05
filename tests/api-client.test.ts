import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { __resetTokenForTests, getToken, setToken } from "@/lib/auth/token";

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

  it("on 401, wipes the token and throws ApiError", async () => {
    setToken("tok-1");
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(401, { error: { code: "unauthorized", message: "expired" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      apiFetch("/api/v1/auth/me", { redirectOn401: false }),
    ).rejects.toBeInstanceOf(ApiError);

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
