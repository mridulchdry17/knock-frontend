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
 * Top-level navigation to the same-origin OAuth bootstrap (`/api/auth/login`).
 * The proxy at that route forwards to the backend's `/auth/login` and pipes
 * Set-Cookie back through the frontend origin — so the OAuth state cookies
 * (and later the refresh token cookie) live on the frontend's domain where
 * subsequent silent-refresh calls can read them.
 */
export function startGmailOAuth(next = "/today"): void {
  if (typeof window === "undefined") return;
  const nextParam = encodeURIComponent(next);
  window.location.href = `/api/auth/login?next=${nextParam}`;
}
