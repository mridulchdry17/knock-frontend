"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Marketing "Sign in" CTA → top-level navigation to `/api/auth/login` on
 * THIS origin. That route proxies to the backend's `/auth/login`, but
 * crucially the proxy is what puts `Set-Cookie` on the browser — so the
 * `oauth_state` + `oauth_code_verifier` cookies (and later the
 * `refresh_token` cookie set by `/auth/google/callback`) live on the
 * frontend origin where every other request can find them.
 *
 * `variant="link"` = the quiet header path for already-invited users.
 * `variant="button"` = a bordered secondary button (footer / repeat CTA).
 */

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
    // Same-origin OAuth bootstrap — the proxy at /api/auth/login handles
    // the redirect to Google and the cookie scoping.
    window.location.href = "/api/auth/login";
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
