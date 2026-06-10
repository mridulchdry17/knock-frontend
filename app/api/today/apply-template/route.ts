import { proxyRequest } from "@/lib/api/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proxy for `POST /api/v1/today/apply-template`. Re-renders every pristine
 * card in today's batch with the chosen template; cards the user has
 * manually edited are preserved. */
export function POST(req: Request) {
  return proxyRequest(req, { upstreamPath: "/api/v1/today/apply-template" });
}
