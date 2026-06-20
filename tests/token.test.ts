import { describe, it, expect, beforeEach } from "vitest";
import { __resetTokenForTests, clearToken, getToken, setToken } from "@/lib/auth/token";

/**
 * Access-token store — memory-only by design (auth-v1).
 *
 * Previous tests round-tripped through sessionStorage to assert the
 * persistence layer; that layer is gone now (the HttpOnly refresh cookie
 * provides persistence instead). What remains to pin: the in-memory store
 * is correct and survives nothing more than a function-call boundary.
 */
describe("token store", () => {
  beforeEach(() => {
    __resetTokenForTests();
  });

  it("returns null when nothing is set", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken stores in memory", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("clearToken wipes the in-memory value", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("does NOT persist to sessionStorage (would be a regression)", () => {
    setToken("abc123");
    // sessionStorage MUST stay empty — auth-v1's whole point is that the
    // access token never lives in JS-accessible persistent storage.
    expect(window.sessionStorage.getItem("knock.token")).toBeNull();
  });

  it("does NOT read from sessionStorage when memory is cold", () => {
    window.sessionStorage.setItem("knock.token", "leftover-from-old-version");
    __resetTokenForTests();
    // A leftover value from a pre-v1 session must NOT be picked up — the
    // refresh flow is the only way to materialize a token now.
    expect(getToken()).toBeNull();
  });
});
