import { apiFetch } from "@/lib/api/client";

/**
 * POST /api/v1/auth/disconnect — clears the user's Gmail refresh token and
 * revokes it at Google. Backend returns `{ ok: true }`.
 *
 * Caller is responsible for refreshing /me afterwards so the rest of the app
 * sees `gmail_connected: false`.
 */
export async function disconnectGmail(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/v1/auth/disconnect", { method: "POST" });
}

/**
 * Top-level navigation to the backend's /auth/login. Same handoff the marketing
 * "Sign in" CTA uses — backend grants Gmail scopes and redirects back to
 * /auth/complete with the token + `next` param.
 */
const FALLBACK_OAUTH_URL = "http://localhost:8000";

export function startGmailOAuth(next = "/today"): void {
  if (typeof window === "undefined") return;
  const base = process.env.NEXT_PUBLIC_BACKEND_OAUTH_URL || FALLBACK_OAUTH_URL;
  const trimmed = base.replace(/\/$/, "");
  const nextParam = encodeURIComponent(next);
  window.location.href = `${trimmed}/auth/login?next=${nextParam}`;
}
