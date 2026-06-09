import { describe, it, expect } from "vitest";
import { decideRoute, homeRouteFor } from "@/lib/auth/route-decision";
import type { CurrentUser } from "@/lib/auth/types";

const free: CurrentUser = {
  id: "u1",
  email: "a@b.co",
  name: "A",
  tier: "free",
  onboarded: true,
  gmail_connected: true,
};
const paid: CurrentUser = { ...free, tier: "paid" };
const admin: CurrentUser = { ...free, tier: "super_admin" };
const pendingNew: CurrentUser = { ...free, tier: "pending", onboarded: false };
const pendingDone: CurrentUser = { ...free, tier: "pending", onboarded: true };
const suspended: CurrentUser = { ...free, tier: "suspended" };

describe("decideRoute matrix", () => {
  it("public paths always allow", () => {
    expect(decideRoute({ path: "/", user: null, hasToken: false })).toEqual({ kind: "allow" });
    expect(decideRoute({ path: "/auth/complete", user: null, hasToken: false })).toEqual({ kind: "allow" });
  });

  it("unauthed access to a protected route redirects to /", () => {
    expect(decideRoute({ path: "/today", user: null, hasToken: false })).toEqual({
      kind: "redirect",
      to: "/",
    });
  });

  it("pending + not onboarded → /onboarding", () => {
    expect(decideRoute({ path: "/today", user: pendingNew, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/onboarding",
    });
    expect(decideRoute({ path: "/onboarding", user: pendingNew, hasToken: true })).toEqual({ kind: "allow" });
  });

  it("pending + onboarded → /awaiting-approval", () => {
    expect(decideRoute({ path: "/today", user: pendingDone, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/awaiting-approval",
    });
    expect(decideRoute({ path: "/awaiting-approval", user: pendingDone, hasToken: true })).toEqual({
      kind: "allow",
    });
  });

  it("approved users on /onboarding bounce to /today", () => {
    expect(decideRoute({ path: "/onboarding", user: free, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/today",
    });
  });

  it("free + paid can hit app routes", () => {
    for (const user of [free, paid]) {
      for (const path of ["/today", "/inbox", "/templates", "/preferences", "/profile"]) {
        expect(decideRoute({ path, user, hasToken: true })).toEqual({ kind: "allow" });
      }
    }
  });

  it("non-admin hitting /admin/* redirects to /today", () => {
    expect(decideRoute({ path: "/admin/users", user: free, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/today",
    });
    expect(decideRoute({ path: "/admin/users", user: paid, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/today",
    });
  });

  it("super_admin can hit /admin/*", () => {
    expect(decideRoute({ path: "/admin/users", user: admin, hasToken: true })).toEqual({ kind: "allow" });
    expect(decideRoute({ path: "/admin/contact-pool", user: admin, hasToken: true })).toEqual({ kind: "allow" });
  });

  it("suspended bounces to /", () => {
    expect(decideRoute({ path: "/today", user: suspended, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/",
    });
  });
});

describe("homeRouteFor", () => {
  it("unauthed → /", () => {
    expect(homeRouteFor(null, false)).toBe("/");
  });
  it("pending new → /onboarding", () => {
    expect(homeRouteFor(pendingNew, true)).toBe("/onboarding");
  });
  it("pending done → /awaiting-approval", () => {
    expect(homeRouteFor(pendingDone, true)).toBe("/awaiting-approval");
  });
  it("free/paid/admin → /today", () => {
    expect(homeRouteFor(free, true)).toBe("/today");
    expect(homeRouteFor(paid, true)).toBe("/today");
    expect(homeRouteFor(admin, true)).toBe("/today");
  });
  it("approved + disconnected → /connect-gmail", () => {
    const disconnected: CurrentUser = { ...free, gmail_connected: false };
    expect(homeRouteFor(disconnected, true)).toBe("/connect-gmail");
  });
  it("approved + reauth required → /connect-gmail (even if /me says connected)", () => {
    expect(homeRouteFor(free, true, true)).toBe("/connect-gmail");
  });
  it("suspended → /", () => {
    expect(homeRouteFor(suspended, true)).toBe("/");
  });
});

describe("decideRoute — gmail states", () => {
  const disconnected: CurrentUser = { ...free, gmail_connected: false };

  it("/onboarding for an approved disconnected user redirects to /connect-gmail", () => {
    expect(decideRoute({ path: "/onboarding", user: disconnected, hasToken: true })).toEqual({
      kind: "redirect",
      to: "/connect-gmail",
    });
  });

  it("/awaiting-approval for a free + reauth user redirects to /connect-gmail", () => {
    expect(
      decideRoute({ path: "/awaiting-approval", user: free, hasToken: true, gmailReauthRequired: true }),
    ).toEqual({ kind: "redirect", to: "/connect-gmail" });
  });

  it("/today is still allowed for a disconnected user (banner takes over)", () => {
    expect(decideRoute({ path: "/today", user: disconnected, hasToken: true })).toEqual({ kind: "allow" });
  });

  it("/connect-gmail is allowed for any approved user", () => {
    expect(decideRoute({ path: "/connect-gmail", user: free, hasToken: true })).toEqual({ kind: "allow" });
    expect(decideRoute({ path: "/connect-gmail", user: disconnected, hasToken: true })).toEqual({
      kind: "allow",
    });
  });
});
