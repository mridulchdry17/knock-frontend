import { ApiError } from "@/lib/api/errors";
import type {
  InboxItem,
  InboxList,
  InboxTab,
  ReplyResult,
  SyncStatus,
  ThreadDetail,
  ThreadMessage,
} from "@/lib/inbox/types";
import { TAB_TO_CATEGORY } from "@/lib/inbox/types";

/**
 * Deterministic 5-thread inbox fixture. Mixed categories so the engineer can
 * see every list-row variant + thread state in one place. Anchored to
 * `now()` so timestamps read sensibly relative to "today".
 */

interface FixtureState {
  items: InboxItem[];
  threads: Map<string, ThreadDetail>;
  archived: Set<string>;
  syncHealthy: boolean;
}

let state: FixtureState | null = null;

function build(): FixtureState {
  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  const threads = new Map<string, ThreadDetail>();
  const items: InboxItem[] = [];

  // 1. Warm reply (unread)
  threads.set("fx-th-1", {
    id: "fx-th-1",
    subject: "Re: Quick intro — interested in Acme's 2026 internship",
    category: "reply",
    sender: {
      name: "Sarah Chen",
      email: "sarah.chen@acme.com",
      role: "Engineering Recruiter",
      company: "Acme",
    },
    messages: [
      msg("fx-m-1a", "outbound", "Alex Student", "alex@school.edu",
        "<p>Hi Sarah,</p><p>I'm a junior studying CS and I've been following Acme's engineering work. I'd love to throw my hat in for the 2026 internship.</p><p>Best,<br>Alex</p>",
        daysAgo(2)),
      msg("fx-m-1b", "inbound", "Sarah Chen", "sarah.chen@acme.com",
        "<p>Hi Alex — thanks for reaching out! Happy to chat. Could you send a few times that work this week?</p><p>Sarah</p>",
        minutesAgo(28)),
    ],
    suggested_followup: null,
  });
  items.push({
    id: "fx-th-1",
    category: "reply",
    subject: "Re: Quick intro — interested in Acme's 2026 internship",
    sender: { name: "Sarah Chen", email: "sarah.chen@acme.com" },
    snippet: "Hi Alex — thanks for reaching out! Happy to chat. Could you send a few times that work this week?",
    last_message_at: minutesAgo(28),
    unread: true,
    message_count: 2,
  });

  // 2. Bounce
  threads.set("fx-th-2", {
    id: "fx-th-2",
    subject: "Mail Delivery Subsystem: Address not found",
    category: "bounce",
    sender: {
      name: "Mail Delivery Subsystem",
      email: "mailer-daemon@googlemail.com",
      role: null,
      company: null,
    },
    messages: [
      msg("fx-m-2a", "outbound", "Alex Student", "alex@school.edu",
        "<p>Hi Jordan,</p><p>Following up on my application…</p>",
        daysAgo(1)),
      msg("fx-m-2b", "inbound", "Mail Delivery Subsystem", "mailer-daemon@googlemail.com",
        "<p>Your message wasn't delivered to <b>jordan@old-co.com</b> because the address couldn't be found.</p>",
        hoursAgo(23)),
    ],
    suggested_followup: null,
  });
  items.push({
    id: "fx-th-2",
    category: "bounce",
    subject: "Mail Delivery Subsystem: Address not found",
    sender: { name: "Mail Delivery Subsystem", email: "mailer-daemon@googlemail.com" },
    snippet: "Your message wasn't delivered to jordan@old-co.com because the address couldn't be found.",
    last_message_at: hoursAgo(23),
    unread: true,
    message_count: 2,
  });

  // 3. Nudge — Knock-suggested follow-up after 5 days
  threads.set("fx-th-3", {
    id: "fx-th-3",
    subject: "Following up — referral about the SWE role at Northwind",
    category: "nudge",
    sender: {
      name: "Maya Patel",
      email: "maya@northwind.io",
      role: "Hiring Manager",
      company: "Northwind",
    },
    messages: [
      msg("fx-m-3a", "outbound", "Alex Student", "alex@school.edu",
        "<p>Hi Maya,</p><p>A mutual contact suggested I reach out about the SWE role.</p><p>Thanks,<br>Alex</p>",
        daysAgo(5)),
    ],
    suggested_followup: {
      subject: "Following up — referral about the SWE role at Northwind",
      body_html:
        "<p>Hi Maya,</p><p>Just a gentle follow-up on my note from last week — would love 15 minutes if you're open.</p><p>Thanks,<br>Alex</p>",
      reason: "5 days since you emailed",
    },
  });
  items.push({
    id: "fx-th-3",
    category: "nudge",
    subject: "Following up — referral about the SWE role at Northwind",
    sender: { name: "Maya Patel", email: "maya@northwind.io" },
    snippet: "Knock drafted a gentle follow-up for day 5. Edit, send, or skip.",
    last_message_at: daysAgo(5),
    unread: false,
    message_count: 1,
  });

  // 4. Read reply (older)
  threads.set("fx-th-4", {
    id: "fx-th-4",
    subject: "Re: Quick follow-up on my application",
    category: "reply",
    sender: {
      name: "Daniel Park",
      email: "dpark@helios.dev",
      role: "Director, Engineering",
      company: "Helios",
    },
    messages: [
      msg("fx-m-4a", "outbound", "Alex Student", "alex@school.edu",
        "<p>Hi Daniel,</p><p>Just wanted to follow up on my application.</p>",
        daysAgo(4)),
      msg("fx-m-4b", "inbound", "Daniel Park", "dpark@helios.dev",
        "<p>Thanks for the nudge — we're closing this round, but I'll keep you in mind for the next one.</p>",
        daysAgo(2)),
    ],
    suggested_followup: null,
  });
  items.push({
    id: "fx-th-4",
    category: "reply",
    subject: "Re: Quick follow-up on my application",
    sender: { name: "Daniel Park", email: "dpark@helios.dev" },
    snippet: "Thanks for the nudge — we're closing this round, but I'll keep you in mind for the next one.",
    last_message_at: daysAgo(2),
    unread: false,
    message_count: 2,
  });

  // 5. Reply (auto-reply / OOO style — still a reply)
  threads.set("fx-th-5", {
    id: "fx-th-5",
    subject: "Re: Coffee chat?",
    category: "reply",
    sender: {
      name: "Priya Rao",
      email: "priya@orbital.co",
      role: "Talent Partner",
      company: "Orbital",
    },
    messages: [
      msg("fx-m-5a", "outbound", "Alex Student", "alex@school.edu",
        "<p>Hi Priya, would love a quick chat.</p>",
        daysAgo(3)),
      msg("fx-m-5b", "inbound", "Priya Rao", "priya@orbital.co",
        "<p>Out of office until Monday — will reply then.</p>",
        daysAgo(3)),
    ],
    suggested_followup: null,
  });
  items.push({
    id: "fx-th-5",
    category: "reply",
    subject: "Re: Coffee chat?",
    sender: { name: "Priya Rao", email: "priya@orbital.co" },
    snippet: "Out of office until Monday — will reply then.",
    last_message_at: daysAgo(3),
    unread: false,
    message_count: 2,
  });

  return {
    items,
    threads,
    archived: new Set<string>(),
    syncHealthy: true,
  };
}

function msg(
  id: string,
  direction: "outbound" | "inbound",
  name: string,
  email: string,
  body_html: string,
  sent_at: string,
): ThreadMessage {
  return { id, direction, from: { name, email }, body_html, sent_at };
}

function getState(): FixtureState {
  if (!state) state = build();
  return state;
}

function activeItems(): InboxItem[] {
  const s = getState();
  return s.items.filter((i) => !s.archived.has(i.id));
}

export function fixtureList(tab: InboxTab): InboxList {
  const cat = TAB_TO_CATEGORY[tab];
  const items = activeItems().filter((i) => (cat ? i.category === cat : true));
  const allActive = activeItems();
  return {
    items: items.map((i) => ({ ...i })),
    total: items.length,
    unread_count: allActive.filter((i) => i.unread).length,
  };
}

export function fixtureThread(id: string): ThreadDetail {
  const s = getState();
  const t = s.threads.get(id);
  if (!t || s.archived.has(id)) {
    throw new ApiError(404, "not_found", "Thread not found.");
  }
  return JSON.parse(JSON.stringify(t)) as ThreadDetail;
}

export function fixtureMarkRead(id: string): void {
  const s = getState();
  const idx = s.items.findIndex((i) => i.id === id);
  if (idx >= 0) s.items[idx] = { ...s.items[idx], unread: false };
}

export function fixtureReply(id: string, bodyHtml: string): ReplyResult {
  const s = getState();
  const t = s.threads.get(id);
  if (!t) throw new ApiError(404, "not_found", "Thread not found.");
  const messageId = `fx-m-${Date.now()}`;
  const sent_at = new Date().toISOString();
  t.messages.push({
    id: messageId,
    direction: "outbound",
    from: { name: "Alex Student", email: "alex@school.edu" },
    body_html: bodyHtml,
    sent_at,
  });
  // Bump list snippet + last_message_at on the active list copy.
  const idx = s.items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    s.items[idx] = {
      ...s.items[idx],
      last_message_at: sent_at,
      message_count: t.messages.length,
      snippet: stripHtml(bodyHtml).slice(0, 200),
    };
  }
  return { ok: true, message_id: messageId };
}

export function fixtureMarkDone(id: string): void {
  const s = getState();
  s.archived.add(id);
}

export function fixtureSyncStatus(): SyncStatus {
  const s = getState();
  return { healthy: s.syncHealthy, last_synced_at: new Date().toISOString() };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Test-only knob to flip sync state. */
export function __setFixtureSyncHealthy(healthy: boolean): void {
  getState().syncHealthy = healthy;
}

/** Test-only: wipe fixture state so tests start clean. */
export function __resetInboxFixturesForTests(): void {
  state = null;
}
