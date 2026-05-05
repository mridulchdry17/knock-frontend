import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/onboarding/status" });
}
