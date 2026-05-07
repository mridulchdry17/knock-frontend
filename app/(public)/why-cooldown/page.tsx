import { ComingSoon } from "@/components/knock/coming-soon";
import { Wordmark } from "@/components/knock/wordmark";

/**
 * Placeholder for the cooldown explainer linked from /awaiting-approval.
 * Real content lands later — for now, locked ComingSoon state.
 */
export default function WhyCooldownPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-card">
      <div className="mb-8">
        <Wordmark size={28} />
      </div>
      <ComingSoon
        title="How Knock keeps reaching out kind."
        body="A short note on cooldowns and the shared lock — coming soon."
      />
    </main>
  );
}
