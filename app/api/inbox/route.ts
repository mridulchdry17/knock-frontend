import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `/api/v1/inbox` — list threads. Forwards `?category` /
 * `?limit` / `?offset` query params verbatim. Backend Phase 5 will land
 * this; until then upstream is absent and the proxy returns the locked
 * 502 envelope, which the typed client maps to `{ kind: "unavailable" }`
 * so the page renders the calm "All caught up." empty state.
 */
export async function GET(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/inbox",
    forwardQuery: true,
  });
}
