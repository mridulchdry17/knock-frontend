import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin OAuth bootstrap.
 *
 * `window.location.href = "/api/auth/login"` (from sign-in-link / startGmailOAuth)
 * hits this route → proxy forwards to backend's `/auth/login` → backend returns
 * 302 to Google's consent screen + Set-Cookie for `oauth_state` and
 * `oauth_code_verifier`.
 *
 * The proxy pipes the Set-Cookie headers back to the browser, which stores
 * them on THIS origin (e.g. knock-murex.vercel.app). When Google later
 * redirects to /api/auth/oauth/callback (also same origin), the browser
 * sends those cookies and the backend can validate the PKCE state.
 *
 * Without this proxy, the OAuth state cookies would live on the backend
 * domain (knock-api.azure.com), and the post-Google callback — which we
 * want to land on the frontend domain for the refresh cookie — wouldn't
 * have access to them.
 *
 * `forwardQuery: true` so an optional `?next=/today` rides along.
 */
export function GET(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/auth/login",
    forwardAuth: false,
    forwardQuery: true,
  });
}
