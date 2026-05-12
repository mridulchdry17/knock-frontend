"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "already" }
  | { kind: "err"; msg: string };

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

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
        track("waitlist_signup", {
          domain: email.split("@")[1] ?? "unknown",
        });
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
        ? "Thanks for joining Knock."
        : "You're already on the Knock waitlist.";
    const subtitle =
      state.kind === "ok"
        ? "We'll knock on your inbox when early access opens."
        : "We'll knock on your inbox when early access opens — no need to sign up again.";
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center">✓</div>
          <div>
            <p className="text-sm font-medium text-zinc-900">{title}</p>
            <p className="mt-1 text-sm text-zinc-600">
              {subtitle} <span className="text-zinc-900">{email}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition"
        />
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="rounded-md bg-zinc-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {state.kind === "loading" ? "Joining…" : "Get early access"}
        </button>
      </div>
      {state.kind === "err" && (
        <p className="text-xs text-red-600">{state.msg}</p>
      )}
    </form>
  );
}
