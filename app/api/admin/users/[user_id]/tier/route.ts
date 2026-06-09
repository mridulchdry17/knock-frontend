import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/admin/users/${encodeURIComponent(user_id)}/tier`,
  });
}
