import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `/api/v1/preferences/excluded-domains/{domain}` — DELETE. */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ domain: string }> },
) {
  const { domain } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/preferences/excluded-domains/${encodeURIComponent(domain)}`,
  });
}
