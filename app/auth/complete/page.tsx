"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth/token";
import { Wordmark } from "@/components/knock/wordmark";
import { Skeleton } from "@/components/ui/skeleton";
import { MossCheckmark } from "@/components/knock/moss-checkmark";

/**
 * OAuth callback target. The backend redirects here as
 *   /auth/complete?next=<path>#token=<id>
 *
 * Flow:
 *   1. Read token from URL fragment (never sent to server).
 *   2. Stash in token store (in-memory + sessionStorage).
 *   3. history.replaceState to scrub the fragment.
 *   4. Show post-grant success state for 2.4s (Moss checkmark + h1).
 *   5. Hard-navigate to `next` (defaults to "/" — the smart-home picker).
 *
 * "Skip" link routes immediately for users who don't want to wait the 2.4s.
 */
const SUCCESS_DWELL_MS = 2400;

function AuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ranRef = useRef(false);
  const [tokenStored, setTokenStored] = useState(false);
  const [next, setNext] = useState<string>("/");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const fragParams = new URLSearchParams(fragment);
    const token = fragParams.get("token");
    const nextParam = params.get("next") || "/";
    setNext(nextParam);

    if (token) {
      setToken(token);
      // Scrub fragment from history. Replace before navigating so back-button doesn't expose it.
      window.history.replaceState(null, "", window.location.pathname);
      setTokenStored(true);
      return;
    }

    // No token in fragment — something went wrong; just bounce to landing.
    router.replace(nextParam);
  }, [params, router]);

  useEffect(() => {
    if (!tokenStored) return;
    const t = setTimeout(() => {
      // Hard-navigate so AuthProvider remounts with the freshly-stored token
      // and a clean /me fetch. router.replace would re-use the in-memory ctx
      // and miss the new token until the next interaction.
      window.location.href = next;
    }, SUCCESS_DWELL_MS);
    return () => clearTimeout(t);
  }, [tokenStored, next]);

  if (!tokenStored) {
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

  function skip() {
    window.location.href = next;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-card relative">
      <div className="text-center">
        <div className="mx-auto" style={{ width: 64, height: 64 }}>
          <MossCheckmark size={64} />
        </div>
        <h1 className="mt-6 text-h1 text-ink">You&apos;re connected.</h1>
        <p className="mt-2 text-body text-ink-2">
          We&apos;ll never send anything without your tap. Heading to today&apos;s batch.
        </p>
      </div>
      <button
        type="button"
        onClick={skip}
        className="absolute bottom-6 right-6 text-small text-ink-3 hover:text-ink underline-offset-4 hover:underline"
      >
        Skip
      </button>
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
