import { EmptyState } from "@/components/knock/empty-state";
import { Wordmark } from "@/components/knock/wordmark";
import { Hourglass } from "lucide-react";

/**
 * Locked SLA copy: "We approve in waves — we'll email you when it's your turn."
 * Polling logic and "claim a different email" branch land in F.2.
 */
export default function AwaitingApprovalPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-card">
      <div className="mb-8">
        <Wordmark size={28} />
      </div>
      <EmptyState
        icon={<Hourglass size={32} strokeWidth={1.5} />}
        title="You're on the list."
        body="We approve in waves — we'll email you when it's your turn."
      />
    </main>
  );
}
