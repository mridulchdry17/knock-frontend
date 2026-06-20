import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google's OAuth post-consent redirect target.
 *
 * Google Cloud Console must register this exact URL as an authorized
 * redirect URI:
 *   https://<frontend-origin>/api/auth/oauth/callback
 *
 * Flow:
 *   1. Google appends ?code=...&state=... and 302s the browser here.
 *   2. Browser sends along the `oauth_state` + `oauth_code_verifier`
 *      cookies (set on THIS origin by /api/auth/login).
 *   3. The proxy forwards the request — including those cookies — to the
 *      backend's `/auth/google/callback`.
 *   4. Backend validates PKCE, exchanges code with Google, mints session +
 *      refresh token, and returns 302 to `/auth/complete?next=...#token=<access>`
 *      with `Set-Cookie: refresh_token=...` on the same response.
 *   5. The proxy pipes the Set-Cookie + Location back to the browser. Cookie
 *      is now scoped to THIS origin — silent refresh from /api/auth/refresh
 *      can read it.
 *
 * forwardAuth=false: no Authorization header is involved in the OAuth
 * round-trip; the only credentials are the PKCE state cookies, which ride
 * the Cookie header (the proxy forwards that automatically).
 *
 * forwardQuery=true: ?code=... and ?state=... must reach the backend
 * untouched.
 */
export function GET(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/auth/google/callback",
    forwardAuth: false,
    forwardQuery: true,
  });
}
