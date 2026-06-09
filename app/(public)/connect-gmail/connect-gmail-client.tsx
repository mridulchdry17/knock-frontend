"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/knock/wordmark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrustGrid } from "@/components/knock/trust-grid";
import { MossCheckmark } from "@/components/knock/moss-checkmark";
import { startGmailOAuth } from "@/lib/auth/gmail";
import { useAuth } from "@/components/auth/auth-context";

const SLOW_THRESHOLD_MS = 8000;

function PreConsentPanel({ reauth }: { reauth: boolean }) {
  const [explainOpen, setExplainOpen] = useState(false);

  function onConnect() {
    // Top-level navigation to backend OAuth bootstrap. Backend grants
    // gmail.send + gmail.readonly and redirects back via /auth/complete.
    startGmailOAuth("/connect-gmail?status=success");
  }

  return (
    <>
      <header className="text-center mb-6">
        <h1 className="text-h1 text-ink">
          {reauth ? "Reconnect your Gmail." : "Connect your Gmail."}
        </h1>
        <p className="mt-3 text-body text-ink-2">
          {reauth
            ? "Just a quick reconnect. Google asks us to refresh permissions periodically. Same scopes, same promises."
            : "Knock sends from your real inbox so recruiters get a real reply-to. Here’s exactly what we ask for and what we never do."}
        </p>
      </header>

      <TrustGrid />

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onConnect}
          className="h-12 w-full max-w-[320px]"
        >
          {reauth ? "Reconnect" : "Connect my Gmail"}
        </Button>
        <button
          type="button"
          onClick={() => setExplainOpen(true)}
          className="text-small text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Why does Knock need this?
        </button>
      </div>

      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent aria-describedby="gmail-explain-desc">
          <DialogHeader>
            <DialogTitle>Why Knock asks for Gmail access</DialogTitle>
            <DialogDescription id="gmail-explain-desc">
              Plain language, no fine print.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-small text-ink-2">
            <p>
              <strong className="text-ink">Send on your behalf (gmail.send).</strong>{" "}
              We use this to deliver the emails you tap “Send” on — through your
              own inbox, with your real reply-to. We never queue bulk sends.
            </p>
            <p>
              <strong className="text-ink">Read replies (gmail.readonly).</strong>{" "}
              We use this only to detect when someone replies to a message we sent —
              so /inbox can show you the response. We never read threads we didn’t
              start.
            </p>
            <p>
              <strong className="text-ink">No AI training.</strong> Your inbox
              never feeds a model. Tokens are encrypted at rest. Disconnect any
              time and we delete them within 24 hours.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InFlightPanel() {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCancel(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-line bg-paper-2 p-card flex flex-col items-center text-center"
    >
      <Spinner />
      <h2 className="mt-4 text-h2 text-ink">We’ll be right here.</h2>
      <p className="mt-1 text-small text-ink-3">Finishing up with Google…</p>
      {showCancel && (
        <p className="mt-6 text-small text-ink-2">
          Taking longer than usual.{" "}
          <a
            href="/connect-gmail"
            className="text-flint underline-offset-4 hover:underline"
          >
            Cancel and try again
          </a>
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-6 w-6 rounded-full border-2 border-flint border-r-transparent animate-spin"
      style={{ animationDuration: "900ms" }}
    />
  );
}

function ConnectGmailInner() {
  const params = useSearchParams();
  const reauth = params.get("reauth") === "1";
  const status = params.get("status");
  const inFlight = status === "in_flight";

  // `?status=success` is a defensive landing — most successful flows land on
  // /auth/complete, but if a deployment routes the OAuth `next` here we still
  // show the success state instead of an empty pre-consent screen.
  const success = status === "success";
  const { user, refresh, clearReauthFlag } = useAuth();

  useEffect(() => {
    if (!success) return;
    void refresh();
    // If /me already says connected, drop the reauth flag.
    if (user?.gmail_connected) clearReauthFlag();
    const t = setTimeout(() => {
      window.location.href = "/today";
    }, 2400);
    return () => clearTimeout(t);
  }, [success, user?.gmail_connected, refresh, clearReauthFlag]);

  return (
    <main className="min-h-screen flex flex-col items-center bg-paper px-card py-12">
      <div className="w-full" style={{ maxWidth: "min(560px, calc(100vw - 40px))" }}>
        <div className="mb-10 flex justify-center">
          <Wordmark size={24} />
        </div>

        {inFlight ? (
          <InFlightPanel />
        ) : success ? (
          <SuccessPanel />
        ) : (
          <PreConsentPanel reauth={reauth} />
        )}
      </div>
    </main>
  );
}

function SuccessPanel() {
  return (
    <div className="text-center">
      <div className="mx-auto" style={{ width: 64, height: 64 }}>
        <MossCheckmark size={64} />
      </div>
      <h1 className="mt-6 text-h1 text-ink">You’re connected.</h1>
      <p className="mt-2 text-body text-ink-2">
        We’ll never send anything without your tap. Heading to today’s batch.
      </p>
    </div>
  );
}

export default function ConnectGmailClient() {
  return (
    <Suspense fallback={null}>
      <ConnectGmailInner />
    </Suspense>
  );
}
