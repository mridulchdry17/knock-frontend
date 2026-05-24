import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List the admin contact pool. forwardQuery carries ?search / ?company_domain
// / ?invalid_only / ?limit / ?offset through to the backend.
export function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/admin/contacts", forwardQuery: true });
}
