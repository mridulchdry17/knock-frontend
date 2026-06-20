/**
 * Silent re-issuance helper for the two-token auth model.
 *
 * `refreshAccessToken()` calls `POST /api/auth/refresh` (which forwards to
 * the backend; auth is via the HttpOnly refresh cookie, not a Bearer header).
 * On 200, the backend returns `{access_token: "..."}` AND sets a fresh
 * refresh cookie via Set-Cookie. We stash the access token in memory and
 * return it so the caller can retry the original request.
 *
 * Single-flight semantics: if N components fire requests concurrently and
 * they all 401, only ONE /refresh call goes out — the others await the same
 * promise. Without this, a fanout of 10 stale requests would trigger 10
 * refreshes (and on a system with rotation, 9 of them would mint dead
 * tokens because the first one already rotated the cookie). Same pattern
 * used by Auth0 / Stripe SPA SDKs.
 */
import { setToken, clearToken } from "@/lib/auth/token";

let inFlight: Promise<string | null> | null = null;

interface RefreshResponse {
  access_token: string;
}

async function doRefresh(): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/auth/refresh", {
      method: "POST",
      // credentials: 'same-origin' is the default in modern browsers, but
      // spelling it out makes the cookie-dependency explicit at the read site.
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Network failure — fail closed. Caller will see null and route to
    // landing rather than spin forever.
    clearToken();
    return null;
  }

  if (!res.ok) {
    // 401 = cookie expired / revoked / reuse-detected. Any other non-2xx is
    // unexpected (config error, upstream 5xx). Both paths: bail to landing.
    clearToken();
    return null;
  }

  let body: RefreshResponse;
  try {
    body = (await res.json()) as RefreshResponse;
  } catch {
    clearToken();
    return null;
  }

  if (typeof body.access_token !== "string" || body.access_token.length === 0) {
    clearToken();
    return null;
  }

  setToken(body.access_token);
  return body.access_token;
}

/**
 * Returns a freshly-minted access token, or null if no valid refresh cookie
 * is in scope. Single-flight: concurrent callers share the same in-flight
 * promise.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Test-only: reset the single-flight latch between tests. */
export function __resetRefreshForTests(): void {
  inFlight = null;
}
