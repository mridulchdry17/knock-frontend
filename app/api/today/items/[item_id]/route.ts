import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `PATCH /api/v1/today/items/{item_id}`. Body forwarded verbatim;
 * Authorization header preserved. Backend Phase 5 will land this — until then
 * upstream returns nothing → 502 envelope.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ item_id: string }> },
) {
  const { item_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/today/items/${encodeURIComponent(item_id)}`,
  });
}
