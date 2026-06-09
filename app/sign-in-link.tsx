"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Marketing "Sign in" CTA → top-level navigation to
 * `${NEXT_PUBLIC_BACKEND_OAUTH_URL}/auth/login`. The backend runs the Google
 * OAuth dance and redirects back to /auth/complete?next=...#token=...
 *
 * Public env var is required (browser-side navigation to the public OAuth
 * bootstrap endpoint, not the proxied API).
 *
 * `variant="link"` = the quiet header path for already-invited users.
 * `variant="button"` = a bordered secondary button (footer / repeat CTA).
 */
const FALLBACK_OAUTH_URL = "http://localhost:8000";

export function SignInLink({
  variant = "link",
  label = "Sign in",
  className,
}: {
  variant?: "link" | "button";
  label?: string;
  className?: string;
}) {
  const [going, setGoing] = useState(false);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (going) return;
    setGoing(true);
    const base = process.env.NEXT_PUBLIC_BACKEND_OAUTH_URL || FALLBACK_OAUTH_URL;
    // Top-level navigation — fine for OAuth bootstrap.
    window.location.href = `${base.replace(/\/$/, "")}/auth/login`;
  }

  const text = going ? "Taking you to Google…" : label;

  if (variant === "button") {
    return (
      <a
        href="#sign-in"
        onClick={onClick}
        aria-busy={going}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-2 bg-paper-2 px-4 text-small font-medium text-ink transition-colors hover:bg-line",
          className,
        )}
      >
        {text}
      </a>
    );
  }

  return (
    <a
      href="#sign-in"
      onClick={onClick}
      aria-busy={going}
      className={cn(
        "text-small text-ink-2 underline-offset-4 transition-colors hover:text-flint hover:underline",
        className,
      )}
    >
      {text}
    </a>
  );
}
