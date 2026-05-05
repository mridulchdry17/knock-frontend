"use client";

/**
 * Marketing-landing "Sign in" CTA.
 *
 * Top-level navigation to `${NEXT_PUBLIC_BACKEND_OAUTH_URL}/auth/login` —
 * the backend handles the Google OAuth dance and redirects back to
 * /auth/complete?next=...#token=...
 *
 * Public env var is required because this is a browser-side navigation; the
 * URL is the public OAuth bootstrap endpoint, not the proxied API. Backend
 * hostname stays in the same domain we already publish in marketing.
 */
const FALLBACK_OAUTH_URL = "http://localhost:8000";

export function SignInLink() {
  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const base = process.env.NEXT_PUBLIC_BACKEND_OAUTH_URL || FALLBACK_OAUTH_URL;
    // Top-level navigation — fine for OAuth bootstrap.
    window.location.href = `${base.replace(/\/$/, "")}/auth/login`;
  }

  return (
    <a
      href="#sign-in"
      onClick={onClick}
      className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline underline-offset-4 transition-colors"
    >
      Sign in
    </a>
  );
}
