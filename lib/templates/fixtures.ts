import { ApiError } from "@/lib/api/errors";
import type {
  Template,
  TemplateInput,
  TemplatePatch,
  TemplatesList,
  TestSendResult,
} from "@/lib/templates/types";

/**
 * Deterministic 3-starter seed for fixture mode. Knock-provided per the locked
 * spec: "Recruiter intro / Warm referral ask / Post-application nudge".
 * is_starter=true; users edit them in place rather than getting a "Mine" group.
 *
 * Variables ({{first_name}}, {{company}}, {{role}}) are rendered as inline
 * mono pills by <VariableChip>; backend resolves them at send time.
 */
const STARTER_SEED: Template[] = [
  {
    id: "fx-tpl-recruiter",
    name: "Recruiter intro",
    subject: "Quick intro — interested in {{company}}'s 2026 internship",
    body:
      "<p>Hi {{first_name}},</p>" +
      "<p>I'm a junior studying CS and I've been following {{company}}'s engineering work. " +
      "I'd love to throw my hat in for the 2026 internship.</p>" +
      "<p>Would love to chat if you have a few minutes this week.</p>" +
      "<p>Best,<br>Alex</p>",
    is_starter: true,
    used_count: 0,
    reply_rate: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "fx-tpl-warm",
    name: "Warm referral ask",
    subject: "Following up — referral about the {{role}} role at {{company}}",
    body:
      "<p>Hi {{first_name}},</p>" +
      "<p>A mutual contact suggested I reach out. I've been hacking on side projects " +
      "for two years and the {{role}} role on your team caught my eye for obvious reasons.</p>" +
      "<p>Would love 15 minutes if you're open.</p>" +
      "<p>Thanks,<br>Alex</p>",
    is_starter: true,
    used_count: 0,
    reply_rate: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "fx-tpl-followup",
    name: "Post-application nudge",
    subject: "Quick follow-up on my application",
    body:
      "<p>Hi {{first_name}},</p>" +
      "<p>Just wanted to follow up on my application from two weeks back — " +
      "happy to share a project I've shipped since then.</p>" +
      "<p>Thanks,<br>Alex</p>",
    is_starter: true,
    used_count: 0,
    reply_rate: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
];

const CAP = 3;

let fixtureItems: Template[] | null = null;

function getState(): Template[] {
  if (!fixtureItems) fixtureItems = STARTER_SEED.map((t) => ({ ...t }));
  return fixtureItems;
}

export function fixtureList(): TemplatesList {
  const items = getState();
  return { items: items.map((t) => ({ ...t })), count: items.length, cap: CAP };
}

export function fixtureCreate(input: TemplateInput): Template {
  const items = getState();
  if (items.length >= CAP) {
    throw new ApiError(
      422,
      "template_limit_reached",
      "You're at your 3-template limit.",
    );
  }
  const now = new Date().toISOString();
  const next: Template = {
    id: `fx-tpl-${Date.now()}`,
    name: input.name,
    subject: input.subject,
    body: input.body,
    is_starter: false,
    used_count: 0,
    reply_rate: null,
    created_at: now,
    updated_at: now,
  };
  items.push(next);
  return { ...next };
}

export function fixtureUpdate(id: string, patch: TemplatePatch): Template {
  const items = getState();
  const idx = items.findIndex((t) => t.id === id);
  if (idx < 0) throw new ApiError(404, "not_found", "Template not found.");
  const cur = items[idx];
  const next: Template = {
    ...cur,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    updated_at: new Date().toISOString(),
  };
  items[idx] = next;
  return { ...next };
}

export function fixtureDelete(id: string): void {
  const items = getState();
  const idx = items.findIndex((t) => t.id === id);
  if (idx < 0) throw new ApiError(404, "not_found", "Template not found.");
  items.splice(idx, 1);
}

export function fixtureTestSend(id: string): TestSendResult {
  const items = getState();
  const found = items.find((t) => t.id === id);
  if (!found) throw new ApiError(404, "not_found", "Template not found.");
  return { sent: true };
}

/** Test-only: wipe fixture state so tests start clean. */
export function __resetTemplateFixturesForTests(): void {
  fixtureItems = null;
}
