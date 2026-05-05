"use client";

import { Shield } from "lucide-react";

/**
 * Trust grid for /connect-gmail. Two columns (stacks on mobile):
 *   "What we ask Google for" | "What we never do"
 * Plus a shield-icon footer with the 24h token-deletion promise.
 *
 * Microcopy is locked — never paraphrase. See project_ui_design_system.md.
 */

const ASK = [
  "Send email on your behalf — only the 7 emails per day you approve, one by one. Never bulk, never automated.",
  "Read your inbox — only to detect replies to messages we sent. We never open threads we didn’t start.",
] as const;

const NEVER = [
  "Read emails from anyone you didn’t write to first.",
  "Share your data with third parties.",
  "Send anything you didn’t tap “Send” on.",
  "Train AI on your inbox.",
] as const;

function Column({ heading, items }: { heading: string; items: readonly string[] }) {
  return (
    <div>
      <h2 className="text-h3 text-ink mb-3">{heading}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="text-small text-ink-2 leading-[20px]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrustGrid() {
  return (
    <section aria-label="Permissions and promises">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-md border border-line bg-paper-2 p-card">
        <Column heading="What we ask Google for" items={ASK} />
        <Column heading="What we never do" items={NEVER} />
      </div>
      <p className="mt-4 flex items-start gap-2 text-small text-ink-3">
        <Shield size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Your data stays with Google. Your tokens are encrypted at rest. You can disconnect
          anytime — we delete your tokens within 24 hours.
        </span>
      </p>
    </section>
  );
}
