import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `/api/v1/preferences` — GET (read) + PATCH (partial update).
 * Authorization forwarded verbatim. Backend Phase 5 will land this; until
 * then upstream is absent and the proxy returns the locked 502 envelope.
 */
export function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/preferences" });
}

export function PATCH(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/preferences" });
}
