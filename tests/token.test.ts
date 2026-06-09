import { describe, it, expect, beforeEach } from "vitest";
import { __resetTokenForTests, clearToken, getToken, setToken } from "@/lib/auth/token";

describe("token store", () => {
  beforeEach(() => {
    __resetTokenForTests();
    window.sessionStorage.clear();
  });

  it("returns null when nothing is set", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips token in memory + sessionStorage", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
    expect(window.sessionStorage.getItem("knock.token")).toBe("abc123");
  });

  it("getToken falls back to sessionStorage if memory is cold", () => {
    window.sessionStorage.setItem("knock.token", "from-storage");
    __resetTokenForTests();
    expect(getToken()).toBe("from-storage");
  });

  it("clearToken wipes both layers", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
    expect(window.sessionStorage.getItem("knock.token")).toBeNull();
  });
});
