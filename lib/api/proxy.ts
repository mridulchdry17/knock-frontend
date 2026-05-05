import { NextResponse } from "next/server";

/**
 * Same-origin proxy helper for Next.js Route Handlers.
 *
 * Forwards an incoming Request to `${BACKEND_URL}<upstreamPath>`, preserving:
 *  - HTTP method
 *  - Authorization header (verbatim, so the bearer token stays opaque)
 *  - Body bytes (passes through as a buffer; we don't re-JSON.parse)
 *
 * Returns the upstream response with status + body intact.
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
}

export async function proxyRequest(
  req: Request,
  { upstreamPath, forwardAuth = true }: ProxyOptions,
): Promise<Response> {
  const backend = process.env.BACKEND_URL;
  if (!backend) {
    return NextResponse.json(CONFIG_503, { status: 503 });
  }

  const url = `${backend.replace(/\/$/, "")}${upstreamPath}`;

  const headers = new Headers();
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("User-Agent", req.headers.get("user-agent") ?? "knock-frontend-proxy");
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers.set("X-Forwarded-For", xff);

  if (forwardAuth) {
    const auth = req.headers.get("authorization");
    if (auth) headers.set("Authorization", auth);
  }

  // Only set content-type if the inbound had one (POST with JSON body).
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let body: BodyInit | undefined;
  if (hasBody) {
    // Read raw bytes so we don't re-encode JSON. Small request bodies only.
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
      // Don't follow redirects — pass them through (OAuth flows handle redirects elsewhere).
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(SNAG_502, { status: 502 });
  }

  // Stream the response body through. Preserve content-type + status.
  const respHeaders = new Headers();
  const upstreamCT = upstream.headers.get("content-type");
  if (upstreamCT) respHeaders.set("Content-Type", upstreamCT);

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: respHeaders,
  });
}
