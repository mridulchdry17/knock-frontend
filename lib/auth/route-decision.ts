import type { CurrentUser, Tier } from "@/lib/auth/types";

/**
 * Pure decision logic — given the current auth state and the requested path,
 * return either "allow" (render the route as-is) or a redirect target.
 *
 * Kept pure so we can snapshot-test the matrix.
 */

export type RouteDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string };

const PUBLIC_PATHS = new Set<string>(["/", "/login", "/auth/complete", "/why-cooldown"]);

/** Routes that require an authenticated user but no specific tier. */
const ANY_AUTHED = new Set<string>(["/onboarding", "/awaiting-approval", "/connect-gmail"]);

const SUPER_ADMIN_PREFIX = "/admin";

/** Routes available to free/paid/super_admin once Gmail and onboarding done. */
const APP_ROUTES = new Set<string>(["/today", "/inbox", "/templates", "/preferences", "/profile"]);

export interface DecisionInput {
  path: string;
  user: CurrentUser | null;
  /** True iff a token is present in the store (prior to /me succeeding). */
  hasToken: boolean;
}

export function decideRoute({ path, user, hasToken }: DecisionInput): RouteDecision {
  // Public marketing/landing + auth callback are always allowed.
  if (PUBLIC_PATHS.has(path)) return { kind: "allow" };

  // Not authed → bounce to landing.
  if (!hasToken || !user) {
    return { kind: "redirect", to: "/" };
  }

  // Suspended users are dead-ended at landing — backend will already 401, but
  // belt-and-braces.
  if (user.tier === "suspended") {
    return { kind: "redirect", to: "/" };
  }

  // Pending tier flow.
  if (user.tier === "pending") {
    if (!user.onboarded) {
      return path === "/onboarding" ? { kind: "allow" } : { kind: "redirect", to: "/onboarding" };
    }
    return path === "/awaiting-approval"
      ? { kind: "allow" }
      : { kind: "redirect", to: "/awaiting-approval" };
  }

  // From here: free | paid | super_admin and approved.
  // Admin namespace requires super_admin.
  if (path.startsWith(SUPER_ADMIN_PREFIX)) {
    return user.tier === "super_admin" ? { kind: "allow" } : { kind: "redirect", to: "/today" };
  }

  // Approved users in onboarding/awaiting-approval bounce forward.
  if (path === "/onboarding" || path === "/awaiting-approval") {
    return { kind: "redirect", to: "/today" };
  }

  if (APP_ROUTES.has(path) || ANY_AUTHED.has(path)) {
    return { kind: "allow" };
  }

  // Unknown path under approved auth — let it through; Next.js 404 will handle.
  return { kind: "allow" };
}

/** Helper for the smart-home / route. */
export function homeRouteFor(user: CurrentUser | null, hasToken: boolean): string {
  if (!hasToken || !user) return "/";
  if (user.tier === "suspended") return "/";
  if (user.tier === "pending") {
    return user.onboarded ? "/awaiting-approval" : "/onboarding";
  }
  return "/today";
}

/** Tier exposed for component checks (e.g. nav admin section). */
export type { Tier };
