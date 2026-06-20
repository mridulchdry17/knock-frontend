import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/admin/waitlist/approve-bulk — body: {ids: int[], tier?}. */
export function POST(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/admin/waitlist/approve-bulk",
  });
}
