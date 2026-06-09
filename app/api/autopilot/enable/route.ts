import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `POST /api/v1/autopilot/enable`. Paid users only. */
export function POST(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/autopilot/enable" });
}
