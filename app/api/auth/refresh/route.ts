import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Silent re-issuance proxy. POSTs to backend's `/api/v1/auth/refresh` —
 * authentication is purely via the HttpOnly refresh cookie (the proxy
 * forwards it via the Cookie header). The backend returns the new access
 * token in the JSON body AND a fresh Set-Cookie header that the proxy
 * pipes back to the browser.
 *
 * forwardAuth=false: this endpoint must NOT carry a stale Authorization
 * bearer — refresh is meant to be called precisely when the access token
 * is missing or expired.
 */
export function POST(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/auth/refresh",
    forwardAuth: false,
  });
}
