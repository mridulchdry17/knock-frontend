import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `/api/v1/templates` — list (GET) + create (POST). Authorization
 * forwarded verbatim. Backend Phase 5 will land this; until then upstream is
 * absent and the proxy returns the locked 502 envelope, which the typed
 * client maps to `{ kind: "unavailable" }` so the page renders the calm
 * "Setting up your starter templates…" empty state.
 */
export async function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/templates" });
}

export async function POST(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/templates" });
}
