import WaitlistForm from "./waitlist-form";
import { SmartHomeRedirect } from "./smart-home-redirect";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      {/* Authed users get bounced per tier; unauthed stay here. */}
      <SmartHomeRedirect />
      <div className="w-full max-w-md">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
            Knock
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
            Cold outreach from your own Gmail.
          </h1>
          <p className="mt-4 text-zinc-600 text-[15px] leading-relaxed">
            Personalized sends, auto follow-ups, and a shared lock so no two
            users ever email the same person. Launching soon — get early access.
          </p>
        </div>

        <WaitlistForm />

        <p className="mt-10 text-xs text-zinc-400">
          We&apos;ll only email you once, when access opens.
        </p>
      </div>
    </main>
  );
}
