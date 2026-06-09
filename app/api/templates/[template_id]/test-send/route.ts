import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy for `POST /api/v1/templates/{template_id}/test-send`. Backend sends a
 * real email to the user's connected Gmail with subject prefixed `[Knock test] `.
 *
 * Failure modes the UI handles:
 *  - 503 gmail_disconnected → "Connect Gmail before sending a test." toast
 *  - 502 upstream_unavailable / other → locked snag voice
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ template_id: string }> },
) {
  const { template_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/templates/${encodeURIComponent(template_id)}/test-send`,
  });
}
