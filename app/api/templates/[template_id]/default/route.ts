import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/templates/{id}/default — mark this template as the user's
 *  autopilot default. Atomic on the backend (unsets every other one). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ template_id: string }> },
) {
  const { template_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/templates/${encodeURIComponent(template_id)}/default`,
  });
}
