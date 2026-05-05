import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `GET /api/v1/today`. Backend Phase 5 will land this endpoint;
 * until then upstream returns nothing → proxy returns 502 envelope, which
 * `useToday()` maps to the "Your first batch is being matched" empty state.
 */
export function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/today" });
}
