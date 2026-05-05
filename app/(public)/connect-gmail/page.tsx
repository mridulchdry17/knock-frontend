import { ComingSoon } from "@/components/knock/coming-soon";
import { Wordmark } from "@/components/knock/wordmark";

export default function ConnectGmailPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-paper px-card">
      <div className="mb-8">
        <Wordmark size={28} />
      </div>
      <ComingSoon />
    </main>
  );
}
