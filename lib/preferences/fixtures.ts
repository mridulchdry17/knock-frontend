import { ApiError } from "@/lib/api/errors";
import type {
  ExcludedDomain,
  ExcludedDomainsList,
  Preferences,
  PreferencesPatch,
} from "@/lib/preferences/types";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/types";

/**
 * In-memory deterministic fixture state for /preferences. Gated by
 * `NEXT_PUBLIC_USE_TODAY_FIXTURES=true`. Reset between test runs with
 * `__resetPreferenceFixturesForTests`.
 */

interface FixtureState {
  prefs: Preferences;
  domains: ExcludedDomain[];
}

let state: FixtureState | null = null;

function getState(): FixtureState {
  if (state) return state;
  state = {
    prefs: {
      ...DEFAULT_PREFERENCES,
      target_role: "Software Engineer Intern",
      target_industries: ["Tech", "Fintech"],
      target_location: "San Francisco",
    },
    domains: [
      { domain: "noreply.com", created_at: "2026-04-01T00:00:00Z" },
      { domain: "spam.example", created_at: "2026-04-02T00:00:00Z" },
    ],
  };
  return state;
}

export function __resetPreferenceFixturesForTests(): void {
  state = null;
}

export function fixtureGetPreferences(): Preferences {
  return { ...getState().prefs };
}

export function fixturePatchPreferences(patch: PreferencesPatch): Preferences {
  const s = getState();
  s.prefs = { ...s.prefs, ...patch };
  return { ...s.prefs };
}

export function fixtureListExcludedDomains(): ExcludedDomainsList {
  return { items: getState().domains.slice() };
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function normalizeDomain(input: string): string {
  let v = input.trim().toLowerCase();
  if (v.startsWith("@")) v = v.slice(1);
  return v;
}

export function fixtureAddExcludedDomain(input: string): ExcludedDomain {
  const domain = normalizeDomain(input);
  if (!DOMAIN_RE.test(domain)) {
    throw new ApiError(422, "invalid_domain", "That doesn't look like a valid domain.");
  }
  const s = getState();
  if (s.domains.some((d) => d.domain === domain)) {
    throw new ApiError(409, "already_excluded", "That's already on your list.");
  }
  const entry: ExcludedDomain = { domain, created_at: new Date().toISOString() };
  s.domains.push(entry);
  return entry;
}

export function fixtureRemoveExcludedDomain(domain: string): void {
  const s = getState();
  const idx = s.domains.findIndex((d) => d.domain === domain);
  if (idx < 0) {
    throw new ApiError(404, "not_found", "That domain isn't on your list.");
  }
  s.domains.splice(idx, 1);
}

export function fixtureEnableAutopilot(): { autopilot_enabled: true } {
  const s = getState();
  s.prefs = { ...s.prefs, autopilot_enabled: true };
  return { autopilot_enabled: true };
}

export function fixtureDisableAutopilot(): { autopilot_enabled: false } {
  const s = getState();
  s.prefs = { ...s.prefs, autopilot_enabled: false };
  return { autopilot_enabled: false };
}
