# PRD — Knock Public Home / Landing Page

- **Status:** ✅ BUILT — on branch `feat/home-landing-page` (waitlist-primary direction), pending review/merge
- **Owner:** Mridul
- **Last updated:** 2026-05-24
- **Surface:** `/` (public root) of `outreach-frontend` (Next.js 16, App Router)
- **Backend changes required:** None for the page itself (one pre-existing OAuth-redirect bug to fix alongside — see §12, NOT yet done)

> ## ✅ Build log (2026-05-24)
> Built on `feat/home-landing-page`. `tsc --noEmit`, `eslint`, and `next build` all pass.
> **New files:** `components/landing/wordmark.tsx`, `components/landing/section-label.tsx`, `components/landing/batch-preview.tsx`.
> **Rewritten:** `app/page.tsx` (full editorial landing — hero + live `/today` artifact + 5 sections + waitlist band + footer), `app/waitlist-form.tsx` (brand tokens + `aria-live` + real `<label>`; "knock on your inbox" confirmation copy), `app/sign-in-link.tsx` (link/button variants + "Taking you to Google…" state), `app/smart-home-redirect.tsx` (now covers marketing while an authed session resolves).
> **Edited:** `app/layout.tsx` (metadata / meta description).
> **Decision taken:** waitlist-primary (header carries "Already invited? Sign in"). Flip-ready for Google-primary later.
> **Autopilot positioning (2026-05-24, 4-agent pass: GTM, product-marketer, UI, UX):** added a minimal "Two ways to send" block at the end of section 01 — manual (bright `bg-paper`, Flint label, moss "Free · the default" pill) vs. an opt-in "Let Knock send" mode (recessed `bg-paper-2`, muted label, outline "Opt-in · when you're ready" pill). Labeled "Let Knock send" not "autopilot" (the word reads as a spam-cannon to the anxious persona; kept "autopilot" as the code-only name). No price/upgrade/CTA (billing deferred). **Truth fix required & applied:** softened the trust bullet "haven't approved" → "didn't set up yourself" and expanded FAQ #3, because the absolute "we never send without approval" promise contradicts autopilot. Student stays the subject of "send"; guardrail ("steps back the moment someone replies") leads.
> **Still open:** BUG-1 (backend `/connect`→`/connect-gmail` OAuth-error redirect) NOT fixed — separate backend change; the hero does not yet read `?error`. BUG-2 (flagged): backend `preferences.py` autopilot 403 says "Upgrade to enable" but there's no self-serve upgrade in v1 — fix that copy before any in-app autopilot surface ships. Scroll-driven motion on the batch artifact deferred (static for now). Real social proof omitted (honest). CTA direction still owner-confirmable.

---

## 1. Summary

Replace the current bare root page (a single waitlist form + a corner "Sign in" text link) with a striking, editorial, conversion-focused public home page. It must, in ~5 seconds, tell an anxious first-time job-seeker what Knock is, make them want it, and capture them — primarily onto the waitlist, with a sign-in path for already-invited users. The page must look deliberately hand-crafted and warm, **not** like a generic AI/Tailwind template.

This PRD synthesizes research from six specialist passes (GTM, copy, visual design, UX/IA, competitive/CRO, technical) against the locked Knock brand system and the real codebase.

---

## 2. Background & problem

- The current `app/page.tsx` renders only `WaitlistForm` + a tiny `SignInLink` in the nav. No product story, no screenshots, no Google button, no trust framing.
- Knock is gated: Google OAuth is in Testing (≈100-user cap) and users are approved in waves. So most new visitors cannot instantly "try it" — they land in `tier='pending'` → `/awaiting-approval`.
- The brand system, theme tokens, auth wiring, and waitlist endpoint already exist and are solid. This is a **front-of-funnel rebuild**, not new plumbing.

---

## 3. Goals & non-goals

### Goals
- G1 — In 5 seconds, a visitor understands what Knock is and who it's for.
- G2 — Capture high-intent visitors (waitlist signup as the primary conversion).
- G3 — Give already-approved/invited users a clean sign-in path.
- G4 — Build trust for a 21-year-old being asked to connect Gmail.
- G5 — Look genuinely premium/editorial and on-brand — not an AI template.
- G6 — Fast, accessible, fully mobile (375px-first).

### Non-goals
- Pricing page / paid-tier marketing (free in v1; billing deferred to v3).
- Blog, docs, changelog, multi-page marketing site.
- Net-new backend endpoints.
- Interactive/scroll-locked product demos (deferred; see §13).
- Internationalization.

---

## 4. Success metrics

| Metric | Target |
|---|---|
| Waitlist signup conversion (visitors → `waitlist_signup`) | Establish baseline; iterate |
| Bounce on `/` (mobile) | < current; hero must pass 5-sec test |
| Sign-in starts from `/` (already-invited) | Tracked |
| Lighthouse perf (mobile) | ≥ 90 |
| Accessibility (axe / Lighthouse a11y) | 100, zero critical violations |

Instrument with existing Vercel Analytics. Events: `waitlist_signup` (already fires, keep), add `home_signin_click`, `home_cta_view` (hero CTA in viewport).

---

## 5. Target persona

An anxious 21-year-old hunting a first internship/job. Targets ~20–50 companies total — each email is precious. Afraid of seeming spammy, unsure how to write a cold email or when to follow up. Mobile-heavy. Campus cohorts use Knock concurrently (the cross-user contact-lock is a cohort feature). **Not** an SDR, founder, or salesperson.

Design litmus test for every decision: *"Would an anxious 21-year-old feel encouraged, not intimidated or sold to?"*

---

## 6. Positioning & messaging

**Positioning:** For students hunting their first internship who freeze at the blank "to:" field, Knock is a coached way to email the right people from your own Gmail — a few worth reading, not hundreds ignored.

**The load-bearing contrast:** "a few good emails" vs. "spray and pray." It differentiates from sales tools, flatters the persona, and reframes the 7/day limit as a feature.

**Message hierarchy (priority order — fear-reduction first):**
1. You won't have to figure out who to email. *(proof: show the small daily batch)*
2. You won't sound like everyone else. *(proof: templates + generic-vs-personal before/after)*
3. No one from your campus emails the same recruiter. *(proof: plain-language cohort contact-lock)*
4. Your Gmail, your name, you press send. *(quiet trust floor everywhere)*

**Voice (LOCKED — hard rules):** warm, coaching, smart-friend. No exclamation marks anywhere. Error voice: "We hit a snag."
**Forbidden words:** leads, prospects, pipeline, outreach (noun), campaigns, sequences, cadences, drips, blast, MQL, conversion rate, boost, supercharge, 10x, growth hack, cheerleader copy ("crushed it"), "Oops/Whoops".
**Approved:** "people I'm reaching out to", "responses", "follow-ups", "templates", "batch", "reach out" (verb).

---

## 7. CTA strategy & decision (NEEDS CONFIRMATION)

**Recommended default: waitlist-primary, ready to flip.**
Because Knock is gated and approving in waves, routing everyone through "Sign in with Google" would wall most visitors at `/awaiting-approval` after asking a nervous user for Gmail access — the worst trade. The public waitlist is also the *fast lane*: joining with the email you later sign in with auto-claims you to `tier='free'`, skipping the pending gate.

- **Primary CTA:** `Join the waitlist` (email only). Appears in hero and footer.
- **Secondary (header):** `Already invited? Sign in with Google`.
- **Architecture stays ready to flip** to Google-primary the day Knock is OAuth-verified and open — same components, swapped emphasis.

**Alternative (if approving same-day):** Google-primary per the GTM pass — "Sign in with Google" as the single repeated CTA, waitlist demoted to a low-contrast text link, and `/awaiting-approval` upgraded into a delightful, referral-driven destination.

> **Decision required from owner:** confirm waitlist-primary (default) vs. Google-primary. Everything below assumes waitlist-primary.

---

## 8. Information architecture (section order)

| # | Section | Purpose | Primary content |
|---|---|---|---|
| 1 | **Top bar** | Brand + escape hatch | Tilted `knock` wordmark; `Already invited? Sign in` link |
| 2 | **Hero** | 5-sec orient + convert | H1, subhead, primary waitlist CTA, trust microcopy |
| 3 | **Product showcase ("the batch")** | Proof | Live `/today` artifact, annotated; "7 a day. You decide." |
| 4 | **How it works** | Demystify | 3 numbered steps: Connect → Review → Send & follow up |
| 5 | **Your voice** | Quality fear | Templates + generic-vs-personal before/after |
| 6 | **The campus line** | Differentiator | Cohort contact-lock in plain words; link to `/why-cooldown` |
| 7 | **Your Gmail, your control** | Trust | What we ask Google for / what we never do; 24h token deletion |
| 8 | **FAQ** | Objections | Free? Spammy? Send without me? Privacy? No replies? |
| 9 | **Waitlist + footer** | Convert + close | Email capture (aspirational SLA), footer links, repeat CTA |

Rationale: orient → trust → act, with the primary action reachable above the fold and trust front-loaded *before* any Gmail ask.

---

## 9. Copy (drop-in, voice-compliant)

### Hero (recommended; 2 alternates retained for A/B)
> **Send the email you've been putting off.**
> Knock hands you a short, reviewed list of recruiters and alumni worth reaching out to — and helps you write the message so it actually sounds like you.
> **[ Join the waitlist ]** · Already invited? Sign in with Google
> *Microcopy under CTA:* We never send anything you haven't read and approved.

- *Alt A:* "A few good people to email today."
- *Alt B:* "Cold emails, minus the cold sweat."

### What is Knock
Knock helps students send thoughtful, personalized emails to recruiters, alumni, and hiring managers — straight from their own Gmail. Each day it gives you a small, reviewed batch of people worth reaching out to, plus templates to help you write the message and gentle reminders for when to follow up. You stay in control of every email; nothing goes out without you.

### How it works (3 steps)
1. **Connect your Gmail** — Your emails send from your real address, as you.
2. **Review today's batch** — See a few people worth reaching out to, and pick who to email.
3. **Send and follow up** — Personalize the template, hit send, and let Knock remind you when to follow up.

### Trust block
**Header:** Your Gmail stays yours.
We only ask Google for what we need to help you send and track your own emails — nothing more.
**We never:** send anything you haven't approved · read mail unrelated to your job search · share or sell your inbox · email your contacts on your own.
**The promise:** Disconnect any time, and we delete your Google access right then.

### Waitlist
**Header:** Not open to everyone just yet.
**Body:** Knock is free, and we're letting people in a few at a time so every new student gets a good first experience. Leave your email and we'll save your spot. We approve in waves, and we'll email you the moment it's your turn.
**Button:** Save my spot
**Success (shipped):** You're on the Knock list. We approve in waves — we'll knock on your inbox when it's your turn.
**Already on list / 409 (shipped):** You're already on the Knock list. No need to sign up twice — we'll knock on your inbox when it's your turn.

### FAQ
- **Is this going to make me look spammy?** — A small, reviewed batch instead of a giant list, real personal messages, and a lock so a whole campus doesn't pile into one inbox. Fewer emails, each one better.
- **Is it really free?** — Yes. Free to use right now.
- **Do you send emails without me seeing them?** — No. You read and approve every email before it goes out.
- **What happens to my Gmail and my privacy?** — We only ask for what's needed to send your reviewed emails and spot replies. We never read unrelated mail or share anything. Disconnect any time.
- **What if no one replies?** — That's normal, and it's not on you. Knock reminds you when to follow up and keeps handing you new people worth reaching out to.

### Meta description (≤155 chars)
Knock helps students send personalized cold emails to recruiters and alumni from their own Gmail — a small reviewed batch daily, with help writing each one.

---

## 10. Visual design direction

**Concept — "the desk before the knock":** stage the page as a study desk in golden hour. Warm paper (`--paper #FAF8F4`), a hard-left editorial "door-frame" spine with hung chapter labels (`01 — THE DESK`), asymmetry, and margin annotations (JetBrains Mono notes with thin Ember leader lines pointing into the product).

**Token usage (from the locked system):**
- Background `--paper #FAF8F4` (never white); raised surfaces `--paper-2 #F4F1EA`.
- Text `--ink #1A1714` / `--ink-2 #4A4540` / `--ink-3 #7A746C` (ink-3 only ≥18px).
- Borders `--line #E8E2D8` / `--line-2 #D4CCBE`. **Border-led, minimal shadow.**
- `--ember #E5552B` = display accent ONLY (wordmark, hero numerals ≥24px, decorative dots) — never body text, never destructive.
- `--flint #B8431C` = all buttons/links. Primary button = Flint bg + Paper text.
- Type: Inter (cv11/ss01/ss03). Display 44/52/600, h1 28/36/600, h2 20/28/600, Body 15/24/400, Caption 12/16/500 uppercase. JetBrains Mono for variable chips/annotations.
- Radii sm 6 / md 10 / lg 14 / pill 999. Light + dark theme.
- Wordmark: tilted "knock" (+6° second k, Ember) for the marketing hero ≥40px; upright for the footer.

**Eight anti-AI-template rules (MUST):** warm paper not white · border-led near-shadowless · left door-frame spine · asymmetric 7/5 grids · editorial margin annotations · Ember-as-punctuation-not-gradient · the tilted-k "knock" motif · real styled product HTML, not flat mockups.

**Product showcase (recommended):** render a real slice of `/today` (avatar strip + 2–3 `RecipientCard`s + the Flint "Send today's batch" bar) as live styled HTML on the paper — **not** in a device/browser bezel. On scroll: a status dot ticks grey→Moss (180ms, color only), one card flips to "Ready," the counter ticks 2→3 once. Ember leader-line annotations: `← only 7 a day, picked at 6am`, `← you press send, not us`.

**Avoid (hard no):** purple/cyan gradient hero, glassmorphism, dark-mode-primary, AI stock illustration, symmetric 3-icon feature rows, device-bezel mockups.

**Motion ("confirms, never decorates"; respects `prefers-reduced-motion`):** wordmark two-rap knock-in on load (once); hero lines stagger-up 240ms; status-dot tick; counter increment once; section labels fade on scroll; waitlist submit draws a 600ms Moss checkmark. No parallax, no scroll-jacking, no looping carousels.

---

## 11. Functional requirements

- **FR1 — Waitlist form.** Reuse `WaitlistForm` → `POST /api/waitlist` proxy → backend `POST /api/v1/waitlist`. Handle 200 (success), 409 `already_registered` (reassuring, not error), 422 `invalid_email`, other → "We hit a snag." Keep `track("waitlist_signup")` on genuine 200 only.
- **FR2 — Sign-in.** Reuse `SignInLink` → top-level nav to `${NEXT_PUBLIC_BACKEND_OAUTH_URL}/auth/login`. On click, set a "Taking you to Google…" state before navigating.
- **FR3 — Smart redirect.** Keep `SmartHomeRedirect`: authed users are routed by `homeRouteFor()` away from `/`. While `status` is `idle/loading`, render a hero skeleton and **suppress** the waitlist band + any sticky CTA so a bounced authed user never flashes marketing (UX risk mitigation).
- **FR4 — OAuth error handling.** Home hero reads `?error` and shows the snag state: "We hit a snag finishing sign-in. Want to try again?" (depends on §12 fix).
- **FR5 — Auth decision tree (verified against code).** On "Sign in with Google":
  - approved (free/paid/super_admin) → `/today` (or `/connect-gmail` if Gmail missing);
  - email on public waitlist → auto-claim → `/today`;
  - brand new → `/onboarding` → ("I'm new" → `join-waitlist` → `/awaiting-approval`) or ("claim other email" → free → `/today`);
  - onboarded-pending → `/awaiting-approval`;
  - declined/error → home hero snag state (§12).

---

## 12. Dependencies / bugs to fix alongside

- **BUG-1 (must fix):** Backend OAuth decline/error redirects to `/connect?error=...` (`outreach-backend/app/routers/auth.py:83,101,108`), but no `/connect` route exists (only `/connect-gmail`). Failed sign-ins silently dump the user on `/`. Fix target to `/?error=oauth` (or a real public error route) and have the hero read `?error`.
- **A11Y-1:** Home `<main>` is missing `id="main"` though the global skip link targets it — add it.
- **A11Y-2:** Waitlist result region needs `aria-live="polite"`; the email input needs a real (visually-hidden) `<label>`, not placeholder-as-label.

---

## 13. Technical plan

**Stack (verified):** Next 16 App Router, Tailwind 3.4 (tokens mapped: `bg-paper`, `text-ink`, `text-flint`, `text-display/h1/h2`…), Radix primitives, lucide-react, Zod, Sonner, Vercel Analytics. Strict TS, Vitest. No animation lib needed.

**Reuse (do not rebuild):** `Button`, `Input`, `Wordmark`, `MossCheckmark`, the token/theme system, `AuthContext`, `SmartHomeRedirect`, `SignInLink`, `WaitlistForm`.

**Build (new):**
```
app/page.tsx                         [rewrite: compose sections + islands]
app/(home)/hero.tsx                  [server]
app/(home)/batch-showcase.tsx        [server + tiny client island for scroll ticks]
app/(home)/how-it-works.tsx          [server]
app/(home)/your-voice.tsx            [server]
app/(home)/campus-lock.tsx           [server]
app/(home)/trust.tsx                 [server]
app/(home)/faq.tsx                   [server]
app/(home)/footer.tsx                [server + client theme toggle island]
components/landing/section-label.tsx [the hung "01 —" spine label]
components/landing/annotation.tsx    [Ember leader-line margin note]
public/                              [create; product screenshot assets + wordmark SVGs]
```

**Rendering:** static/SSR server components; client islands limited to `WaitlistForm`, `SignInLink`, `SmartHomeRedirect`, batch-showcase scroll ticks, footer theme toggle. No API calls on first paint.

**Performance:** `next/image` for any raster screenshots (add `public/`); prefer live-HTML product artifact over heavy images; no third-party embeds; keep JS islands minimal.

**Assets:** product screenshot/artifact + the `wordmark-tilted.svg` / `wordmark-upright.svg` (currently the wordmark is a text placeholder — swap when SVGs land).

---

## 14. Accessibility requirements

- Skip link works (`id="main"` on home `<main>`).
- Logical focus order: wordmark → sign-in → hero CTA → through sections → waitlist input → submit → footer → footer CTA.
- Google button: visible text label; Google mark `aria-hidden`.
- Waitlist result in `aria-live="polite"`; success/error never color-only (keep ✓ glyph + text).
- `--focus` cool-blue ring on every interactive (2px + 2px offset).
- Respect `prefers-reduced-motion` (transforms off, opacity ≤100ms).
- Body contrast ≥4.5:1; tap targets ≥44×44px mobile.

---

## 15. Responsive spec

- **375px (primary):** single column, 20px gutters; H1 ~28px; full-width 48px CTA; sections stack in IA order; optional slim sticky bottom CTA (waitlist) that hides when the footer/waitlist band is in view and while auth `status==="loading"`.
- **768px:** content max ~560px; trust cards 3-up; drop sticky bar.
- **1024 / 1440px:** centered column max ~640–1280px; generous paper margins; door-frame spine fully expressed.

---

## 16. Out of scope / future

- Scroll-locked or fully interactive embedded product demos.
- Real social proof (school wordmarks, "students from N schools", recruiter-reply screenshots) — add only when truthfully available; do not fake traction.
- Referral/virality loop on `/awaiting-approval` (pairs with a future Google-primary flip).
- Campus-specific landing variants (`?school=`).

---

## 17. Open decisions

1. **CTA direction (§7):** waitlist-primary (recommended) vs. Google-primary. *Blocks final hero layout.*
2. Hero copy: ship recommended, or A/B the three options.
3. Social proof: omit at launch (honest) or add a signed founder note now.
4. PRD location: this file lives in `outreach-frontend/` — move/copy to backend `prd.md` conventions if preferred.

---

## 18. Build sequence (suggested)

1. Token/metadata sanity + `public/` + `id="main"` + a11y fixes (§12).
2. Hero + waitlist island (conversion core).
3. Product showcase (live `/today` artifact) — highest impact, most effort.
4. How-it-works + your-voice + campus-lock.
5. Trust + FAQ + footer.
6. Mobile/375 + a11y + reduced-motion pass.
7. Fix BUG-1 (OAuth error redirect) + wire hero `?error` state.

---

## 19. Acceptance criteria

- [x] CTA direction confirmed; hero matches it. *(waitlist-primary; owner-confirmable)*
- [x] All sections render with voice-compliant copy (no forbidden words; zero exclamation marks).
- [x] Waitlist form: 200/409/422/error states all correct; `waitlist_signup` fires only on genuine 200. *(logic preserved; restyled to brand + `aria-live` + label)*
- [~] Sign-in initiates OAuth *(done)*; declined/errored sign-in shows the hero snag state — **pending BUG-1** (backend redirect + hero `?error` reader).
- [x] Authed user hitting `/` is redirected without flashing marketing/waitlist *(SmartHomeRedirect now covers during resolve)*.
- [x] On-brand & editorial; none of the eight anti-template rules violated; no purple-gradient/glassmorphism/bezel mockups.
- [ ] Lighthouse: perf ≥90 mobile, a11y 100; zero critical axe violations. *(not yet measured; `tsc`/`eslint`/`next build` all pass)*
- [x] Built responsive 375 / 768 / 1024 / 1440px; tap targets ≥44px *(visual QA in a browser still recommended)*.
- [x] `prefers-reduced-motion` honored *(via global reduce rule + CSS-only motion)*.
- [x] No backend endpoint changes *(BUG-1 redirect fix deferred to a backend change)*.

---

*Appendix: full copy deck (hero alternates, complete FAQ), GTM objection-handling table, ASCII wireframes, and the competitive reference gallery are available on request — say the word and I'll append them.*
