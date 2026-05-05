"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { decideRoute } from "@/lib/auth/route-decision";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Wraps an authenticated layout. Reads auth context, runs the pure decision
 * matrix in lib/auth/route-decision, redirects accordingly. While auth is
 * loading we render a soft skeleton instead of flashing the page.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, status, hasToken, gmailReauthRequired } = useAuth();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || status === "idle") return;
    const decision = decideRoute({ path: pathname, user, hasToken, gmailReauthRequired });
    if (decision.kind === "redirect" && decision.to !== pathname) {
      router.replace(decision.to);
    }
  }, [pathname, user, hasToken, gmailReauthRequired, status, router]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="p-gutter">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full max-w-xl mb-2" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
