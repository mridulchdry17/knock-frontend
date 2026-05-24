"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { homeRouteFor } from "@/lib/auth/route-decision";

/**
 * Mounted on `/`. Two jobs:
 *  1. If the visitor is authed, route them to the right home per tier.
 *  2. While an authed session is resolving, cover the marketing with a paper
 *     screen so a returning approved user never flashes the landing before the
 *     redirect fires.
 *
 * Unauthed visitors (no token) never see the cover — the landing renders
 * immediately. The cover only shows when a token is present but the session
 * hasn't resolved/redirected yet.
 */
export function SmartHomeRedirect() {
  const { user, status, hasToken, gmailReauthRequired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || status === "idle") return;
    if (!hasToken) return; // unauthed: stay on landing
    const target = homeRouteFor(user, hasToken, gmailReauthRequired);
    if (target !== "/") router.replace(target);
  }, [user, status, hasToken, gmailReauthRequired, router]);

  // Only cover for someone who has a token and is mid-resolve / about to be
  // redirected. Never covers a genuine unauthenticated visitor.
  const covering = hasToken && status !== "unauthenticated";
  if (!covering) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-paper"
    >
      <span className="sr-only">Loading</span>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-2 border-t-flint" />
    </div>
  );
}
