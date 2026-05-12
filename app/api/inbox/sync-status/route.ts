import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `GET /api/v1/inbox/sync-status` — Gmail-sync health probe. */
export async function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/inbox/sync-status" });
}
