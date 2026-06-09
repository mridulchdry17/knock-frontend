import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Permanently remove a contact from the pool (e.g. a bounced bad address).
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ contact_id: string }> },
) {
  const { contact_id } = await ctx.params;
  return proxyRequest(req, {
    upstreamPath: `/api/v1/admin/contacts/${encodeURIComponent(contact_id)}`,
  });
}
