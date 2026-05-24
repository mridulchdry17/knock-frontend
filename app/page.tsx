import WaitlistForm from "./waitlist-form";
import { SmartHomeRedirect } from "./smart-home-redirect";
import { SignInLink } from "./sign-in-link";
import { Wordmark } from "@/components/landing/wordmark";
import { SectionLabel } from "@/components/landing/section-label";
import { TemplateResolve } from "@/components/landing/template-resolve";
import { LandingVariableChip } from "@/components/landing/landing-variable-chip";

/* ─────────────────────────── small section helpers ─────────────────────────── */

function Annotation({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 font-mono text-caption text-ink-3">
      <span aria-hidden="true" className="text-ember">
        ←
      </span>
      <span>{children}</span>
    </p>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Connect your Gmail",
    body: "Emails send from your real address, signed with your name — so they land like a person wrote them, because one did.",
  },
  {
    n: "02",
    title: "Get a short daily batch",
    body: "Each morning, a few recruiters and alumni worth reaching out to — picked for you. No list-building, no scraping.",
  },
  {
    n: "03",
    title: "Make it yours, then send",
    body: "Fill in their name, company and role, tweak the words until they sound like you, read every one — and press send.",
  },
];

const FAQS = [
  {
    q: "Does Knock write my emails with AI?",
    a: "No — you write the message, in your own words. Knock only fills in who it's going to (their name, company, and role), and you read every email before it sends. Nothing is auto-written.",
  },
  {
    q: "Is this going to make me look spammy?",
    a: "The opposite is the point. You get a small, reviewed batch instead of a giant list, you write a real message in your voice, and a lock keeps a whole campus from piling into one inbox. Fewer emails, each one better.",
  },
  {
    q: "Do you send emails without me seeing them?",
    a: "By default, no — you read and approve every email before it goes out. There's an optional mode you can turn on later that sends the batch you've already set up, on limits you choose, and it steps back the moment someone replies. It stays off until you choose it.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Knock is free to use right now.",
  },
  {
    q: "What happens to my Gmail and my privacy?",
    a: "We only ask Google for what's needed to send your reviewed emails and notice replies — nothing else in your inbox. We never read unrelated mail, and we never share or sell anything. Disconnect any time and your access is deleted on the spot.",
  },
  {
    q: "What if I send an email and no one replies?",
    a: "That's normal, and it's not on you — most first emails don't get answered. Knock reminds you when to follow up and keeps handing you new people worth reaching out to.",
  },
];

/* ─────────────────────────────────── page ─────────────────────────────────── */

export default function Page() {
  return (
    <>
      {/* Authed visitors are routed per tier; this also covers the marketing
          while a session resolves so they never flash the landing. */}
      <SmartHomeRedirect />

      {/* top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Wordmark className="text-2xl" />
        <nav className="flex items-center gap-3 text-small text-ink-3">
          <span className="hidden sm:inline">Already invited?</span>
          <SignInLink label="Sign in" />
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6">
        {/* ───────────────── hero ───────────────── */}
        <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-24">
          <div className="lg:order-1 lg:col-span-5">
            <p className="mb-5 font-mono text-caption uppercase text-ink-3">
              For your first internship hunt
            </p>
            <h1 className="text-h1 font-semibold tracking-tight text-ink sm:text-display">
              Write it once.
              <br className="hidden sm:block" /> It still sounds like you
              <span className="text-ember">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body text-ink-2">
              You write one short message in your own words. Knock fills in each
              person&apos;s name, company and role — and you read every one
              before it sends, from your own Gmail.
            </p>

            <div className="mt-8 max-w-md">
              <WaitlistForm />
              <p className="mt-3 text-caption text-ink-3">
                You write it; we never auto-write a word. Free while we&apos;re
                in early access.
              </p>
            </div>
          </div>

          {/* the personalization artifact — now the hero */}
          <div className="lg:order-2 lg:col-span-7">
            <TemplateResolve className="animate-fade-in" />
            <div className="mt-4 space-y-1.5">
              <Annotation>your sentence, their details — filled in for you</Annotation>
              <Annotation>you press send — never us</Annotation>
            </div>
          </div>
        </section>

        {/* ───────────────── 01 sounds like you ───────────────── */}
        <section className="border-t border-line py-14 sm:py-20" aria-labelledby="voice">
          <SectionLabel index="01">Sounds like you</SectionLabel>
          <h2 id="voice" className="mt-4 max-w-xl text-h1 font-semibold tracking-tight text-ink">
            Your words. Their details. Not a form letter.
          </h2>
          <p className="mt-4 max-w-xl text-body text-ink-2">
            Start from a template built for students reaching out for the first
            time, then make each one sound like you. Same effort — one reads like
            a template, one reads like a person.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-paper-2 p-card">
              <p className="font-mono text-caption uppercase text-ink-3">
                What a recruiter usually gets
              </p>
              <p className="mt-3 text-small italic text-ink-3">
                &ldquo;Dear Sir/Madam, I am writing to express my interest in
                opportunities at your esteemed organization…&rdquo;
              </p>
            </div>
            <div className="rounded-md border border-line-2 bg-paper p-card shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-caption uppercase text-flint">
                  What you&apos;d actually say
                </p>
                <span className="font-mono text-caption text-ink-3">
                  from <LandingVariableChip name="first_name" />
                </span>
              </div>
              <p className="mt-3 text-small text-ink">
                &ldquo;Hi Priya — I rebuilt my portfolio around design systems
                after seeing Figma&apos;s work on Dev Mode, and I&apos;d love to
                ask you one question about breaking in…&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────── 02 how it works ───────────────── */}
        <section className="border-t border-line py-14 sm:py-20" aria-labelledby="how">
          <SectionLabel index="02">How it works</SectionLabel>
          <h2 id="how" className="mt-4 max-w-xl text-h1 font-semibold tracking-tight text-ink">
            Three steps, and none of them is &ldquo;stare at a blank box.&rdquo;
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t border-line pt-4">
                <span className="font-mono text-display leading-none text-ember">
                  {s.n}
                </span>
                <h3 className="mt-3 text-h3 font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>

          {/* two ways to send — manual (default) vs let-Knock-send (opt-in).
              Manual stays visually primary; the second mode is recessed,
              Ember-free, no CTA, framed as control you spend up front. */}
          <div className="mt-12">
            <p className="font-mono text-caption uppercase text-ink-3">
              Two ways to send
            </p>
            <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
              <div className="bg-paper p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-caption uppercase text-flint">
                    Review it yourself
                  </p>
                  <span className="rounded-pill bg-moss-tint px-2 py-0.5 text-caption font-medium text-moss">
                    Free · the default
                  </span>
                </div>
                <p className="mt-2 text-small text-ink-2">
                  You read every batch and press send. This is how Knock works
                  for everyone, from day one.
                </p>
              </div>
              <div className="bg-paper-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-caption uppercase text-ink-3">
                    Let Knock send
                  </p>
                  <span className="rounded-pill border border-line-2 px-2 py-0.5 text-caption text-ink-3">
                    Opt-in · when you&apos;re ready
                  </span>
                </div>
                <p className="mt-2 text-small text-ink-2">
                  When you&apos;re ready, you can let Knock send your daily
                  batch for you. It stays off until you turn it on, and pauses
                  as soon as someone replies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 03 your campus ───────────────── */}
        <section className="border-t border-line py-14 sm:py-20" aria-labelledby="campus">
          <SectionLabel index="03">Your campus</SectionLabel>
          <div className="mt-4 rounded-lg border border-line bg-paper-2 p-6 sm:p-8">
            <span className="inline-block rounded-pill bg-ochre-tint px-2.5 py-1 font-mono text-caption uppercase text-ochre">
              36h cohort hold
            </span>
            <h2 id="campus" className="mt-4 max-w-xl text-h1 font-semibold tracking-tight text-ink">
              No one from your campus emails the same recruiter.
            </h2>
            <p className="mt-4 max-w-2xl text-body text-ink-2">
              When you reach out to someone, Knock holds that contact for
              everyone else for a day and a half. So a whole cohort never lands
              in one recruiter&apos;s inbox on the same day — your email stands
              on its own.{" "}
              <a
                href="/why-cooldown"
                className="text-flint underline-offset-4 hover:underline"
              >
                Why the hold
              </a>
              .
            </p>
          </div>
        </section>

        {/* ───────────────── 04 trust ───────────────── */}
        <section className="border-t border-line py-14 sm:py-20" aria-labelledby="trust">
          <SectionLabel index="04">Your Gmail, your control</SectionLabel>
          <h2 id="trust" className="mt-4 max-w-xl text-h1 font-semibold tracking-tight text-ink">
            Your Gmail stays yours.
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
            <div className="bg-paper p-6">
              <p className="font-mono text-caption uppercase text-ink-3">
                What we ask Google for
              </p>
              <ul className="mt-4 space-y-2.5 text-small text-ink-2">
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="text-moss">✓</span>
                  Permission to send the emails you&apos;ve reviewed
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="text-moss">✓</span>
                  A way to notice replies, so we can nudge your follow-ups
                </li>
              </ul>
            </div>
            <div className="bg-paper p-6">
              <p className="font-mono text-caption uppercase text-ink-3">
                What we never do
              </p>
              <ul className="mt-4 space-y-2.5 text-small text-ink-2">
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="text-ink-3">—</span>
                  Write or send anything you didn&apos;t set up yourself
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="text-ink-3">—</span>
                  Read mail unrelated to your job search
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="text-ink-3">—</span>
                  Share or sell your inbox
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-caption text-ink-3">
            Disconnect any time, and we delete your Google access right then.
          </p>
        </section>

        {/* ───────────────── 05 questions ───────────────── */}
        <section className="border-t border-line py-14 sm:py-20" aria-labelledby="faq">
          <SectionLabel index="05">Questions</SectionLabel>
          <h2 id="faq" className="mt-4 text-h1 font-semibold tracking-tight text-ink">
            The honest answers.
          </h2>
          <dl className="mt-8 divide-y divide-line border-t border-line">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-h3 font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1.5 max-w-2xl text-small text-ink-2">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* ───────────────── waitlist band ───────────────── */}
      <section className="border-y border-line-2 bg-paper-2" aria-labelledby="waitlist">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="font-mono text-caption uppercase text-ink-3">
            Not open to everyone just yet
          </p>
          <h2 id="waitlist" className="mt-4 max-w-2xl text-h1 font-semibold tracking-tight text-ink">
            Save your spot.
          </h2>
          <p className="mt-4 max-w-2xl text-body text-ink-2">
            Knock is free, and we&apos;re letting people in a few at a time so
            every new student gets a good first experience. Leave your email —
            we approve in waves, and we&apos;ll reach out the moment it&apos;s
            your turn.
          </p>
          <div className="mt-8 max-w-md">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ───────────────── footer ───────────────── */}
      <footer className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center">
          <div>
            <Wordmark className="text-lg" tilted={false} />
            <p className="mt-2 text-caption text-ink-3">
              A kinder way to reach out. Made for students sending their first
              cold emails.
            </p>
          </div>
          <div className="flex items-center gap-4 text-small text-ink-3">
            <a href="/why-cooldown" className="hover:text-flint hover:underline underline-offset-4">
              The cohort hold
            </a>
            <SignInLink variant="button" label="Sign in with Google" />
          </div>
        </div>
      </footer>
    </>
  );
}
