import { ApiError } from "@/lib/api/errors";
import type {
  TodayBatch,
  TodayItem,
  TodayItemPatch,
  BatchDispatchResult,
  SkipTodayResult,
  AutopilotPauseResult,
  AutopilotResumeResult,
} from "@/lib/today/types";

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

/**
 * In-memory fixture state for action mutations. Built on first access; mutations
 * persist for the page session. This lets local dev exercise the full ready /
 * skip / edit / send flow without any backend.
 *
 * Reset on hard reload. Not exposed in production builds (mutation client only
 * calls these when `NEXT_PUBLIC_USE_TODAY_FIXTURES=true`).
 */
let fixtureState: TodayBatch | null = null;
let autopilotPaused: { paused: boolean; paused_at: string | null } = {
  paused: false,
  paused_at: null,
};

function getState(): TodayBatch {
  if (!fixtureState) fixtureState = buildTodayFixture();
  return fixtureState;
}

/** Shared fixture batch (initialized lazily). Mutations apply to this object. */
export function getFixtureBatch(): TodayBatch {
  return getState();
}

/** Test-only: wipe in-memory fixture state. */
export function __resetFixtureStateForTests(): void {
  fixtureState = null;
  autopilotPaused = { paused: false, paused_at: null };
}

export async function fixtureUpdateCard(
  itemId: string,
  patch: TodayItemPatch,
): Promise<TodayItem> {
  const state = getState();
  const idx = state.items.findIndex((i) => i.id === itemId);
  if (idx === -1) {
    throw new ApiError(404, "card_not_found", "Card not found.");
  }
  const current = state.items[idx];
  if (current.status === "sent") {
    throw new ApiError(409, "card_already_sent", "This card was already sent.");
  }
  const next: TodayItem = {
    ...current,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.body !== undefined ? { body: patch.body, body_preview: patch.body.slice(0, 200) } : {}),
    ...(patch.send_time !== undefined ? { send_time: patch.send_time } : {}),
    ...(patch.template_id !== undefined ? { template_id: patch.template_id } : {}),
  };
  state.items[idx] = next;
  return next;
}

export async function fixtureSendBatch(): Promise<BatchDispatchResult> {
  const state = getState();
  const ready = state.items.filter((i) => i.status === "ready");
  if (ready.length === 0) {
    throw new ApiError(422, "no_ready_cards", "Mark at least one card ready.");
  }
  const now = new Date();
  const firstAt = now.toISOString();
  const lastAt = new Date(now.getTime() + (ready.length - 1) * 90 * 1000).toISOString();
  ready.forEach((item, i) => {
    const sentAt = new Date(now.getTime() + i * 90 * 1000).toISOString();
    const idx = state.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      state.items[idx] = { ...state.items[idx], status: "sent", sent_at: sentAt };
    }
  });
  state.sent_today += ready.length;
  return {
    dispatched_count: ready.length,
    scheduled_first_at: firstAt,
    scheduled_last_at: lastAt,
    batch_token: `fx-batch-${Date.now()}`,
  };
}

export async function fixtureSkipToday(): Promise<SkipTodayResult> {
  const state = getState();
  state.items = state.items.map((i) =>
    i.status === "sent" ? i : { ...i, status: "skipped" },
  );
  return { skipped: true };
}

export async function fixturePauseAutopilot(): Promise<AutopilotPauseResult> {
  const at = new Date().toISOString();
  autopilotPaused = { paused: true, paused_at: at };
  return { paused: true, paused_at: at };
}

export async function fixtureResumeAutopilot(): Promise<AutopilotResumeResult> {
  autopilotPaused = { paused: false, paused_at: null };
  return { paused: false };
}

export function fixtureAutopilotPausedAt(): string | null {
  return autopilotPaused.paused_at;
}
