import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `POST /api/v1/admin/waitlist/{entry_id}/approve`. */
export async function POST(req: Request, ctx: { params: Promise<{ entry_id: string }> }) {
  const { entry_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/admin/waitlist/${encodeURIComponent(entry_id)}/approve`,
  });
}
