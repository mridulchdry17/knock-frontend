import { clearToken, getToken } from "@/lib/auth/token";
import { ApiError, toApiError } from "@/lib/api/errors";

/**
 * Typed fetch wrapper for /api/v1/*.
 *
 * Same-origin proxy pattern: client-side calls hit our Next.js routes (e.g.
 * /api/waitlist) which forward to BACKEND_URL server-side. For F.1 we expose
 * a generic apiFetch that targets relative paths so it works against either
 * the proxy or, in tests, a mocked global fetch.
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

  const res = await fetch(path, {
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
