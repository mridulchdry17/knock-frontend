import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `/api/v1/preferences/excluded-domains` — GET (list) + POST (add). */
export function GET(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/preferences/excluded-domains",
  });
}

export function POST(req: Request) {
  return proxyRequest(req, {
    upstreamPath: "/api/v1/preferences/excluded-domains",
  });
}
