import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `/api/v1/templates/{template_id}` — PATCH (partial update) + DELETE.
 * Body forwarded verbatim; Authorization preserved.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ template_id: string }> },
) {
  const { template_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/templates/${encodeURIComponent(template_id)}`,
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ template_id: string }> },
) {
  const { template_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/templates/${encodeURIComponent(template_id)}`,
  });
}
