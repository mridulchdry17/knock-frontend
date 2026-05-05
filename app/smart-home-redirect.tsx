"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { homeRouteFor } from "@/lib/auth/route-decision";

/**
 * Mounted on `/` alongside the waitlist landing.
 * If the user is authed, route them to the right home per tier.
 * If not, the landing page renders normally.
 */
export function SmartHomeRedirect() {
  const { user, status, hasToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || status === "idle") return;
    if (!hasToken) return; // unauthed: stay on landing
    const target = homeRouteFor(user, hasToken);
    if (target !== "/") router.replace(target);
  }, [user, status, hasToken, router]);

  return null;
}
