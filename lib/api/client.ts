import { clearToken, getToken } from "@/lib/auth/token";
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
 * Anything else is passed through unchanged (lets us call the public
 * waitlist proxy `/api/waitlist` directly during the F.1 → F.2 migration).
 *
 * 401 → clear token + redirect to landing. Single source of truth for re-auth.
 */

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

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, body, headers, redirectOn401, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const target = toProxyPath(path);

  const res = await fetch(target, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 401) {
    clearToken();
    const shouldRedirect = redirectOn401 ?? typeof window !== "undefined";
    if (shouldRedirect && typeof window !== "undefined") {
      window.location.href = DEFAULT_LANDING;
    }
    const errBody = await res.json().catch(() => null);
    throw toApiError(401, errBody);
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
