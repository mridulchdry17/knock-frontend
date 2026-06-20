import { NextResponse } from "next/server";

/**
 * Same-origin proxy helper for Next.js Route Handlers.
 *
 * Forwards an incoming Request to `${BACKEND_URL}<upstreamPath>`, preserving:
 *  - HTTP method
 *  - Authorization header (verbatim, so the bearer token stays opaque)
 *  - Body bytes (passes through as a buffer; we don't re-JSON.parse)
 *  - Optional query string (when `forwardQuery: true`, the inbound request's
 *    search params are appended to the upstream URL — used by /admin/users
 *    list endpoints that take `?tier=…&search=…&limit=…&offset=…`).
 *
 * Returns the upstream response with status + body intact.
 *  - JSON paths buffer the response (default).
 *  - When `stream: true`, the body is piped through unbuffered and the upstream
 *    `Content-Disposition` header is forwarded too (used by /admin/waitlist.csv).
 *
 * On network failure: 502 with the locked error envelope.
 *
 * `BACKEND_URL` is server-only — never exposed to the browser.
 */

const SNAG_502 = {
  error: { code: "upstream_unavailable", message: "We hit a snag." },
};

const CONFIG_503 = {
  error: { code: "config_error", message: "Service unavailable." },
};

interface ProxyOptions {
  /** Backend path to forward to, e.g. "/api/v1/auth/me". */
  upstreamPath: string;
  /** Forward the Authorization header from the inbound request. Default true. */
  forwardAuth?: boolean;
  /** Append the inbound URL's search params to the upstream URL. Default false. */
  forwardQuery?: boolean;
  /** Stream the upstream response body through unbuffered + forward Content-Disposition. */
  stream?: boolean;
}

export async function proxyRequest(
  req: Request,
  { upstreamPath, forwardAuth = true, forwardQuery = false, stream = false }: ProxyOptions,
): Promise<Response> {
  const backend = process.env.BACKEND_URL;
  if (!backend) {
    return NextResponse.json(CONFIG_503, { status: 503 });
  }

  let url = `${backend.replace(/\/$/, "")}${upstreamPath}`;
  if (forwardQuery) {
    const inbound = new URL(req.url);
    const qs = inbound.search; // includes leading "?" or "" if none
    if (qs) url += qs;
  }

  const headers = new Headers();
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("User-Agent", req.headers.get("user-agent") ?? "knock-frontend-proxy");
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers.set("X-Forwarded-For", xff);

  if (forwardAuth) {
    const auth = req.headers.get("authorization");
    if (auth) headers.set("Authorization", auth);
  }

  // Forward the inbound Cookie header to the backend. Required for the
  // refresh-token flow: the browser stores the refresh cookie on the
  // proxy origin (localhost:3001 in dev / knock.app in prod), and the
  // backend reads it via `Cookie:` on /api/v1/auth/refresh. Without this,
  // the backend never sees the cookie and refresh fails with 401.
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let body: BodyInit | undefined;
  if (hasBody) {
    const buf = await req.arrayBuffer();
    body = buf.byteLength > 0 ? buf : undefined;
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(SNAG_502, { status: 502 });
  }

  const respHeaders = new Headers();
  const upstreamCT = upstream.headers.get("content-type");
  if (upstreamCT) respHeaders.set("Content-Type", upstreamCT);

  // Forward Set-Cookie headers from backend → browser. Required for the
  // refresh-token flow (OAuth callback + /refresh + /logout all issue or
  // clear the HttpOnly cookie). A single response can carry multiple
  // Set-Cookie headers — getSetCookie() returns them as a string[] with
  // each value intact. Iterating `headers` directly would fold them into
  // one comma-joined string (per the WHATWG Headers spec), which corrupts
  // the cookie stream because cookie values can legitimately contain commas
  // (e.g. `expires=Thu, 01 Jan 1970 …` on a clear).
  for (const v of upstream.headers.getSetCookie()) {
    respHeaders.append("set-cookie", v);
  }

  // Forward Location for 3xx redirects (e.g. OAuth: /auth/login returns a
  // 302 to Google's consent screen; /auth/google/callback returns a 302 to
  // /auth/complete?#token=...). The browser follows whatever we put in
  // Location. Safe to forward unconditionally — non-redirect responses
  // simply don't have this header.
  const upstreamLocation = upstream.headers.get("location");
  if (upstreamLocation) respHeaders.set("Location", upstreamLocation);

  if (stream) {
    const cd = upstream.headers.get("content-disposition");
    if (cd) respHeaders.set("Content-Disposition", cd);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: respHeaders,
  });
}
