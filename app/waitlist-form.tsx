"use client";

import { useId, useState } from "react";
import { track } from "@vercel/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "already" }
  | { kind: "err"; msg: string };

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputId = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "loading") return;
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Genuine new signup — fire analytics conversion event.
        track("waitlist_signup", { domain: email.split("@")[1] ?? "unknown" });
        setState({ kind: "ok" });
        return;
      }

      const code = data?.error?.code;
      if (code === "already_registered") {
        setState({ kind: "already" });
        return;
      }

      const msg =
        code === "validation_error" || code === "invalid_email"
          ? "Enter a valid email address."
          : data?.error?.message ?? "We hit a snag. Try again in a moment.";
      setState({ kind: "err", msg });
    } catch {
      setState({ kind: "err", msg: "We hit a snag. Try again in a moment." });
    }
  }

  if (state.kind === "ok" || state.kind === "already") {
    const title =
      state.kind === "ok"
        ? "You're on the Knock list."
        : "You're already on the Knock list.";
    const subtitle =
      state.kind === "ok"
        ? "We approve in waves — we'll knock on your inbox when it's your turn."
        : "No need to sign up twice — we'll knock on your inbox when it's your turn.";
    return (
      <div
        aria-live="polite"
        className="animate-fade-in rounded-md border border-line bg-paper-2 p-5"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-moss text-[11px] text-paper"
          >
            ✓
          </span>
          <div>
            <p className="text-body font-medium text-ink">{title}</p>
            <p className="mt-1 text-small text-ink-2">
              {subtitle} <span className="text-ink">{email}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Your email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu"
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          size="lg"
          disabled={state.kind === "loading"}
          className="h-11"
        >
          {state.kind === "loading" ? "Saving…" : "Save my spot"}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-[1.25rem]">
        {state.kind === "err" && (
          <span className="text-small text-bordeaux">{state.msg}</span>
        )}
      </p>
    </form>
  );
}
