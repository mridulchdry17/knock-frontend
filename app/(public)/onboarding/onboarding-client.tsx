"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/knock/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { claimWaitlist, joinWaitlist } from "@/lib/auth/onboarding";

type Branch = "menu" | "claim";
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; tone: "warn" | "danger"; message: string; offerNew?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Two-card welcome wizard per spec §3.1 / soft-gate model.
 *  - Card A: claim a different waitlist email → POST /onboarding/claim-waitlist
 *  - Card B: I'm new → POST /onboarding/join-waitlist → /awaiting-approval
 *
 * After a successful claim, we refresh the auth context so the route guard
 * re-evaluates with the new tier and routes to /today (or smart home).
 */
export default function OnboardingClient() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [branch, setBranch] = useState<Branch>("menu");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind === "loading") return;
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus({
        kind: "error",
        tone: "warn",
        message: "Enter a valid email address.",
      });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      await claimWaitlist(trimmed);
      // Tier flipped to free server-side. Re-fetch /me, then route.
      await refresh();
      router.replace("/today");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404 || e.code === "not_on_waitlist") {
          setStatus({
            kind: "error",
            tone: "warn",
            message:
              "We couldn't find a waitlist entry for that email. Want to join with this account instead?",
            offerNew: true,
          });
          return;
        }
        if (e.status === 409 || e.code === "waitlist_email_taken") {
          setStatus({
            kind: "error",
            tone: "danger",
            message: "That waitlist email is already linked to another account.",
          });
          return;
        }
      }
      setStatus({
        kind: "error",
        tone: "danger",
        message: "We hit a snag. Try again in a moment.",
      });
    }
  }

  async function onJoin() {
    if (status.kind === "loading") return;
    setStatus({ kind: "loading" });
    try {
      await joinWaitlist();
      await refresh();
      router.replace("/awaiting-approval");
    } catch {
      setStatus({
        kind: "error",
        tone: "danger",
        message: "We hit a snag. Try again in a moment.",
      });
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center bg-paper px-card py-12"
      style={{ maxWidth: "100vw" }}
    >
      <div className="w-full max-w-[440px] mx-auto" style={{ maxWidth: "min(440px, calc(100vw - 40px))" }}>
        <div className="mb-10 flex justify-center">
          <Wordmark size={48} />
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-h1 text-ink">Welcome — glad you knocked.</h1>
          {user?.email ? (
            <p className="mt-2 text-small text-ink-3">
              Signed in as <span className="text-ink-2">{user.email}</span>
            </p>
          ) : null}
        </header>

        <div className="space-y-3">
          {/* Card A — Claim different email */}
          <section
            className={
              "rounded-md border border-line bg-paper-2 p-card transition-colors " +
              (branch === "claim" ? "border-line-2" : "")
            }
          >
            {branch !== "claim" ? (
              <button
                type="button"
                onClick={() => {
                  setBranch("claim");
                  setStatus({ kind: "idle" });
                }}
                className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2 rounded-md"
              >
                <h2 className="text-h3 text-ink">I joined the waitlist with a different email</h2>
                <p className="mt-1 text-small text-ink-2">
                  Paste the email you signed up with — we&apos;ll match it to your spot.
                </p>
              </button>
            ) : (
              <form onSubmit={onClaim} className="space-y-3" noValidate>
                <div>
                  <h2 className="text-h3 text-ink">Claim your waitlist spot</h2>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="claim-email">Waitlist email</Label>
                  <Input
                    id="claim-email"
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    disabled={status.kind === "loading"}
                    aria-describedby="claim-email-help"
                  />
                  <p id="claim-email-help" className="text-small text-ink-3">
                    We&apos;ll match it to your waitlist entry.
                  </p>
                </div>

                {status.kind === "error" ? (
                  <Alert tone={status.tone} aria-live="polite">
                    <AlertDescription>
                      {status.message}
                      {status.offerNew ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBranch("menu");
                            setStatus({ kind: "idle" });
                          }}
                          className="ml-1 text-flint underline-offset-4 hover:underline"
                        >
                          Switch to &ldquo;I&apos;m new&rdquo;
                        </button>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" disabled={status.kind === "loading"}>
                    {status.kind === "loading" ? "Just a sec…" : "Claim my spot"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setBranch("menu");
                      setStatus({ kind: "idle" });
                    }}
                    disabled={status.kind === "loading"}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* Card B — I'm new */}
          <section className="rounded-md border border-line bg-paper-2 p-card">
            <h2 className="text-h3 text-ink">I&apos;m new here</h2>
            <p className="mt-1 text-small text-ink-2">
              We&apos;ll add you to the list. We approve in waves.
            </p>
            {branch === "menu" && status.kind === "error" && !status.offerNew ? (
              <div className="mt-3">
                <Alert tone={status.tone} aria-live="polite">
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              </div>
            ) : null}
            <div className="mt-4">
              <Button type="button" onClick={onJoin} disabled={status.kind === "loading"}>
                {status.kind === "loading" && branch === "menu" ? "Just a sec…" : "Join the waitlist"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
