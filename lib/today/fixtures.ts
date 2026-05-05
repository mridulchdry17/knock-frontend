import type { TodayBatch } from "@/lib/today/types";

/**
 * Deterministic fixture batch for local development. Gated by
 * `NEXT_PUBLIC_USE_TODAY_FIXTURES=true`. Never reaches production unless
 * the env flag is explicitly set on a build.
 *
 * Mix of statuses so the engineer/designer can see every card variant in
 * one place: default / ready / cooldown / skipped / sent.
 */
export function buildTodayFixture(): TodayBatch {
  // Anchor times to "today" so the avatar dots & send-time chips read sensibly.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = today.toISOString().slice(0, 10);
  const at = (h: number, m = 0) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  return {
    generated_at: at(6),
    date,
    cap: 7,
    sent_today: 1,
    items: [
      {
        id: "fx-1",
        recipient: {
          name: "Sarah Chen",
          email: "sarah.chen@stripe.com",
          role: "Recruiter, University Programs",
          company: "Stripe",
          company_domain: "stripe.com",
          linkedin_url: "https://www.linkedin.com/in/sarahchen",
          avatar_url: null,
        },
        template_id: "tpl-recruiter",
        template_name: "Recruiter intro",
        subject: "Quick intro — interested in Stripe's 2026 internship",
        body_preview:
          "Hi Sarah, I'm a junior at UW studying CS and I've been following Stripe's payments infra work — particularly the recent post on idempotency keys. I'd love to throw my hat in for the 2026 internship.",
        body: "Hi Sarah,\n\nI'm a junior at UW studying CS and I've been following Stripe's payments infra work — particularly the recent post on idempotency keys. I'd love to throw my hat in for the 2026 internship.\n\nWould love to chat if you have a few minutes this week.\n\nBest,\nAlex",
        send_time: at(9, 42),
        status: "ready",
        cooldown_until: null,
        sent_at: null,
      },
      {
        id: "fx-2",
        recipient: {
          name: "Marcus Patel",
          email: "marcus@vercel.com",
          role: "Engineering Manager, DX",
          company: "Vercel",
          company_domain: "vercel.com",
          linkedin_url: null,
          avatar_url: null,
        },
        template_id: "tpl-warm",
        template_name: "Warm referral",
        subject: "Following up — referral from Priya about the DX role",
        body_preview:
          "Hi Marcus, Priya suggested I reach out. I've been hacking on small Next.js side projects for two years and the DX role on your team caught my eye for obvious reasons.",
        body: "Hi Marcus,\n\nPriya suggested I reach out. I've been hacking on small Next.js side projects for two years and the DX role on your team caught my eye for obvious reasons.\n\nWould love 15 minutes if you're open.\n\nThanks,\nAlex",
        send_time: at(10, 30),
        status: "default",
        cooldown_until: null,
        sent_at: null,
      },
      {
        id: "fx-3",
        recipient: {
          name: "Jamie Liu",
          email: "jamie.liu@notion.so",
          role: "Senior Recruiter",
          company: "Notion",
          company_domain: "notion.so",
          linkedin_url: "https://www.linkedin.com/in/jamieliu",
          avatar_url: null,
        },
        template_id: "tpl-recruiter",
        template_name: "Recruiter intro",
        subject: "Interest in Notion's PM internship",
        body_preview:
          "Hi Jamie, I've been a daily Notion user since freshman year and the PM internship posting matches what I've been hoping for.",
        body: "Hi Jamie,\n\nI've been a daily Notion user since freshman year and the PM internship posting matches what I've been hoping for.\n\nThanks,\nAlex",
        send_time: at(13, 15),
        status: "cooldown",
        // 32 hours from now per the spec's locked microcopy example
        cooldown_until: new Date(Date.now() + 32 * 3600 * 1000).toISOString(),
        sent_at: null,
      },
      {
        id: "fx-4",
        recipient: {
          name: null,
          email: "careers@linear.app",
          role: null,
          company: "Linear",
          company_domain: "linear.app",
          linkedin_url: null,
          avatar_url: null,
        },
        template_id: "tpl-recruiter",
        template_name: "Recruiter intro",
        subject: "Internship application — Linear",
        body_preview:
          "Hi Linear team, I've been using Linear since the team plan launched and would love to be considered for the 2026 internship cohort.",
        body: "Hi Linear team,\n\nI've been using Linear since the team plan launched and would love to be considered for the 2026 internship cohort.\n\nThanks,\nAlex",
        send_time: at(14, 0),
        status: "skipped",
        cooldown_until: null,
        sent_at: null,
      },
      {
        id: "fx-5",
        recipient: {
          name: "Rohan Das",
          email: "rohan@anthropic.com",
          role: "Recruiting Lead",
          company: "Anthropic",
          company_domain: "anthropic.com",
          linkedin_url: null,
          avatar_url: null,
        },
        template_id: "tpl-followup",
        template_name: "Follow-up",
        subject: "Quick follow-up on my application",
        body_preview:
          "Hi Rohan, just wanted to follow up on my application from two weeks back — happy to share a project I've shipped since then.",
        body: "Hi Rohan,\n\nJust wanted to follow up on my application from two weeks back — happy to share a project I've shipped since then.\n\nThanks,\nAlex",
        send_time: at(8, 15),
        status: "sent",
        cooldown_until: null,
        sent_at: at(8, 15),
      },
    ],
  };
}
