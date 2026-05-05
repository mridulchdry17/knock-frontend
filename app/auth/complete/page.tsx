"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth/token";
import { Wordmark } from "@/components/knock/wordmark";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * OAuth callback target. The backend redirects here as
 *   /auth/complete?next=<path>#token=<id>
 * We:
 *   1. Read the token from the URL fragment (never sent to server).
 *   2. Stash it in the token store (in-memory + sessionStorage).
 *   3. history.replaceState to scrub the fragment from history.
 *   4. Hard-redirect to the `next` path (defaults to "/" for the smart home).
 */
function AuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const fragParams = new URLSearchParams(fragment);
    const token = fragParams.get("token");
    const next = params.get("next") || "/";

    if (token) {
      setToken(token);
      // Scrub fragment from history. We replace before navigating so back-button doesn't expose it.
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Use replace so /auth/complete doesn't sit in browser history.
    router.replace(next);
  }, [params, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-card">
      <div className="mb-8">
        <Wordmark size={28} />
      </div>
      <Skeleton className="h-4 w-48" />
      <p className="mt-4 text-small text-ink-3">Signing you in…</p>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <AuthCompleteInner />
    </Suspense>
  );
}
