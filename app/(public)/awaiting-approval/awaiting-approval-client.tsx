"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wordmark } from "@/components/knock/wordmark";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/auth-context";
import { useApprovalPoll } from "@/lib/auth/use-approval-poll";

const STEPS = [
  {
    n: "1",
    title: "Connect Gmail",
    body: "We send through your own Gmail — never a shared inbox.",
  },
  {
    n: "2",
    title: "Pick exclusions",
    body: "Tell us companies and people to skip. We pick the rest.",
  },
  {
    n: "3",
    title: "Review your daily batch",
    body: "Open Knock once a day, review who we lined up, hit send.",
  },
] as const;

const AUTO_ROUTE_MS = 2400;

/**
 * Locked SLA copy: "We approve in waves — we'll email you when it's your turn."
 *
 * Polling lives in `useApprovalPoll`. This component owns:
 *  - tier-flip toast + auto-route to /connect-gmail
 *  - sign-out footer
 *  - manual "Check status" affordance
 *  - mode-aware status line (active / backoff / stopped)
 */
export default function AwaitingApprovalClient() {
  const router = useRouter();
  const { user, signOutRemote } = useAuth();
  const routedRef = useRef(false);

  const { mode, error, refresh, loading } = useApprovalPoll({
    onApproved: () => {
      if (routedRef.current) return;
      routedRef.current = true;
      const t = setTimeout(() => router.replace("/connect-gmail"), AUTO_ROUTE_MS);
      toast("You're in. Welcome.", {
        action: {
          label: "Take me there →",
          onClick: () => {
            clearTimeout(t);
            router.replace("/connect-gmail");
          },
        },
      });
    },
  });

  // Defensive: if the auth context already shows an approved tier (e.g. user
  // refreshed the page after approval but before polling fired), bounce.
  useEffect(() => {
    if (!user) return;
    if (user.tier === "pending" || user.tier === "suspended") return;
    if (routedRef.current) return;
    routedRef.current = true;
    router.replace("/connect-gmail");
  }, [user, router]);

  async function onSignOut() {
    toast("Signed out. Come back soon.");
    await signOutRemote();
  }

  function onPolishProfile() {
    // Mobile heuristic: profile has the personal fields, preferences has the
    // operational ones. Spec says profile (mobile) / preferences (desktop).
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    router.push(isMobile ? "/profile" : "/preferences");
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-paper px-card py-12">
      <div className="w-full max-w-[520px] mx-auto" style={{ maxWidth: "min(520px, calc(100vw - 40px))" }}>
        <div className="mb-10 flex justify-center">
          <Wordmark size={48} />
        </div>

        <header className="text-center mb-10">
          <h1 className="text-h1 text-ink">You&apos;re on the list.</h1>
          <p className="mt-3 text-body text-ink-2">
            We approve in waves — we&apos;ll email you when it&apos;s your turn.
          </p>
        </header>

        <section className="rounded-md border border-line bg-paper-2 p-card mb-6">
          <h2 className="text-h3 text-ink mb-4">What you&apos;ll do once you&apos;re in</h2>
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <div
                  className="shrink-0 h-7 w-7 rounded-full bg-ember-tint text-flint text-small font-semibold flex items-center justify-center"
                  aria-hidden
                >
                  {s.n}
                </div>
                <div>
                  <div className="text-small font-medium text-ink">{s.title}</div>
                  <div className="text-small text-ink-2">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-h3 text-ink mb-3">While you wait</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="secondary" onClick={onPolishProfile}>
              Polish your profile
            </Button>
            <a
              href="/why-cooldown"
              className="text-flint text-small underline-offset-4 hover:underline"
            >
              Read: how Knock keeps reaching out kind
            </a>
          </div>
        </section>

        {/* Mode-aware status line */}
        {mode === "backoff" && (
          <p className="text-small text-ochre mb-4" aria-live="polite">
            Having trouble checking in. We&apos;ll keep trying.
          </p>
        )}
        {mode === "stopped" && (
          <Alert tone="warn" className="mb-4">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Connection&apos;s flaky.</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-flint underline-offset-4 hover:underline"
              >
                Refresh page
              </button>
            </AlertDescription>
          </Alert>
        )}
        {mode === "active" && error ? (
          <p className="text-small text-ink-3 mb-4" aria-live="polite">
            Just had a hiccup checking in. We&apos;ll try again shortly.
          </p>
        ) : null}

        <div className="flex justify-center mb-8">
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Checking…" : "Check status"}
          </Button>
        </div>

        {/* Footer: identity + sign-out */}
        {user ? (
          <p className="text-small text-ink-3 text-center">
            Logged in as <span className="text-ink-2">{user.email}</span> ·{" "}
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="text-flint underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </p>
        ) : null}
      </div>
    </main>
  );
}
