import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `POST /api/v1/inbox/{thread_id}/done` — archive the thread. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ thread_id: string }> },
) {
  const { thread_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/inbox/${encodeURIComponent(thread_id)}/done`,
  });
}
