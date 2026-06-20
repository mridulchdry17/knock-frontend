import { clearToken, getToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { ApiError, toApiError } from "@/lib/api/errors";

/**
 * Typed fetch wrapper for `/api/v1/*` backend paths.
 *
 * Same-origin proxy strategy: callers pass the canonical backend path
 * (e.g. `/api/v1/auth/me`) and we rewrite it to the matching Next.js Route
 * Handler under `/api/*` (e.g. `/api/auth/me`). The route handler is the only
 * thing that knows the real BACKEND_URL.
 *
 * Mapping:
 *   /api/v1/<rest>  →  /api/<rest>
 * Anything else is passed through unchanged.
 *
 * 401 handling — auth-v1 path:
 *  1. First attempt: send the request with whatever access token is in memory.
 *  2. On 401 with code='access_token_expired' (or no token in memory):
 *     silently call /auth/refresh. If it returns a fresh access token,
 *     retry the original request ONCE.
 *  3. If refresh fails OR the retry still 401s: clear the access token and
 *     redirect to landing. The user re-logs.
 *  4. Codes meaning "session genuinely revoked at Google" (not just expired
 *     — e.g. user clicked Disconnect, Google revoked the OAuth grant) still
 *     surface as GMAIL_REAUTH_EVENT for AuthContext to handle.
 *
 * Single-flight refresh is guaranteed by `refreshAccessToken()` — if ten
 * components each fire a request and all 401 simultaneously, exactly one
 * /auth/refresh call goes out.
 */
export const GMAIL_REAUTH_EVENT = "knock:gmail-reauth-required" as const;
const SESSION_DEAD_CODES = new Set(["session_expired", "invalid_token", "token_revoked"]);
/** Refresh-cookie-side error codes from the backend's /refresh endpoint. The
 * frontend sees these directly only when calling /auth/refresh (which goes
 * through fetch, not apiFetch); inside apiFetch they appear if anyone bypasses
 * refreshAccessToken and hits /api/auth/refresh directly. */
const REFRESH_DEAD_CODES = new Set([
  "no_refresh_token",
  "refresh_invalid",
  "refresh_reuse_detected",
]);

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** When false, skip the Authorization header even if a token exists. */
  auth?: boolean;
  /** Override redirect-on-401. Defaults to true in browser, false on server. */
  redirectOn401?: boolean;
};

const DEFAULT_LANDING = "/";
const V1_PREFIX = "/api/v1/";

/** Rewrite `/api/v1/<rest>` → `/api/<rest>`. Other paths pass through. */
export function toProxyPath(path: string): string {
  if (path.startsWith(V1_PREFIX)) {
    return "/api/" + path.slice(V1_PREFIX.length);
  }
  return path;
}

/** Send a single request with the CURRENT access token. Internal — does NOT
 * recurse on 401. Refresh + retry orchestration is in `apiFetch`. */
async function sendOnce(
  target: string,
  options: ApiFetchOptions,
): Promise<Response> {
  const { auth = true, body, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  return fetch(target, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin", // cookies (refresh + any session) ride along
  });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { redirectOn401, ...rest } = options;
  const target = toProxyPath(path);

  // The /auth/refresh path is the ONE endpoint that must not enter the
  // refresh-retry loop — that would be infinite recursion. Callers should
  // use `refreshAccessToken()` directly, but defend here as well.
  const isRefreshCall = target === "/api/auth/refresh";

  let res = await sendOnce(target, rest);

  // Try silent refresh exactly once on 401 (and only if not already in the
  // refresh path). If refresh returns a token, retry the original request.
  if (res.status === 401 && !isRefreshCall) {
    const errBody = await res.clone().json().catch(() => null);
    const err = toApiError(401, errBody);
    const isGenuineSessionDeath = SESSION_DEAD_CODES.has(err.code);

    // Don't silent-refresh when the backend explicitly said 'this session
    // is dead' (e.g. /disconnect cleared it) — refresh will likely 401 too,
    // and the destructive redirect should happen now.
    if (!isGenuineSessionDeath) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        // LOAD-BEARING: this reassignment is what prevents the fall-through
        // `if (res.status === 401)` block below from being a "Response body
        // already read" error. The original 401's body was consumed via
        // res.clone().json() above; this fresh response's body is untouched.
        // If anyone refactors and removes the reassignment, the retry path
        // breaks silently — write a test before changing it.
        res = await sendOnce(target, rest);
      }
    }
  }

  if (res.status === 401) {
    const errBody = await res.json().catch(() => null);
    const err = toApiError(401, errBody);

    const tokenStillInMemory = Boolean(getToken());
    const sessionDead =
      SESSION_DEAD_CODES.has(err.code) ||
      REFRESH_DEAD_CODES.has(err.code) ||
      !tokenStillInMemory;

    if (sessionDead) {
      clearToken();
      const shouldRedirect = redirectOn401 ?? typeof window !== "undefined";
      if (shouldRedirect && typeof window !== "undefined") {
        window.location.href = DEFAULT_LANDING;
      }
    } else if (typeof window !== "undefined") {
      // Gmail token revoked at Google. Surface to AuthContext; keep the session.
      window.dispatchEvent(new CustomEvent(GMAIL_REAUTH_EVENT));
    }
    throw err;
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw toApiError(res.status, errBody);
  }

  if (res.status === 204) return undefined as T;
  // Some endpoints return empty body on success; tolerate.
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, "invalid_response", "We hit a snag. Try again in a moment.");
  }
}
