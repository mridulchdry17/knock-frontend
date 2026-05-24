import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multipart CSV upload → backend bulk upsert. The proxy forwards the inbound
// Content-Type (multipart boundary) + body bytes verbatim, and forwardQuery
// carries ?dry_run through.
export function POST(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/admin/contacts/bulk/csv",
    forwardQuery: true,
  });
}
