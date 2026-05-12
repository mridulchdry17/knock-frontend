import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  AutopilotDisableResultSchema,
  AutopilotEnableResultSchema,
  ExcludedDomainSchema,
  ExcludedDomainsListSchema,
  PreferencesSchema,
  type AutopilotDisableResult,
  type AutopilotEnableResult,
  type ExcludedDomain,
  type ExcludedDomainsResult,
  type Preferences,
  type PreferencesPatch,
  type PreferencesResult,
} from "@/lib/preferences/types";
import {
  fixtureAddExcludedDomain,
  fixtureDisableAutopilot,
  fixtureEnableAutopilot,
  fixtureGetPreferences,
  fixtureListExcludedDomains,
  fixturePatchPreferences,
  fixtureRemoveExcludedDomain,
} from "@/lib/preferences/fixtures";

/** F.8 reuses F.5a/F.6's fixture flag — one knob for all dev fixture data. */
export function isFixtureMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES === "true";
}

export async function fetchPreferences(): Promise<PreferencesResult> {
  if (isFixtureMode()) {
    return { kind: "loaded", data: fixtureGetPreferences() };
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/preferences");
    const data = PreferencesSchema.parse(raw);
    return { kind: "loaded", data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 502) return { kind: "unavailable" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading preferences."),
    };
  }
}

export async function updatePreferences(patch: PreferencesPatch): Promise<Preferences> {
  if (isFixtureMode()) {
    return fixturePatchPreferences(patch);
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/preferences", {
      method: "PATCH",
      body: patch,
    });
    return PreferencesSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag saving. Try again in a moment.");
  }
}

export async function fetchExcludedDomains(): Promise<ExcludedDomainsResult> {
  if (isFixtureMode()) {
    return { kind: "loaded", data: fixtureListExcludedDomains() };
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/preferences/excluded-domains");
    const data = ExcludedDomainsListSchema.parse(raw);
    return { kind: "loaded", data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 502) return { kind: "unavailable" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading domains."),
    };
  }
}

export async function addExcludedDomain(domain: string): Promise<ExcludedDomain> {
  if (isFixtureMode()) {
    return fixtureAddExcludedDomain(domain);
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/preferences/excluded-domains", {
      method: "POST",
      body: { domain },
    });
    return ExcludedDomainSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}

export async function removeExcludedDomain(domain: string): Promise<void> {
  if (isFixtureMode()) {
    fixtureRemoveExcludedDomain(domain);
    return;
  }
  try {
    await apiFetch<unknown>(
      `/api/v1/preferences/excluded-domains/${encodeURIComponent(domain)}`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}

export async function enableAutopilot(): Promise<AutopilotEnableResult> {
  if (isFixtureMode()) return fixtureEnableAutopilot();
  try {
    const raw = await apiFetch<unknown>("/api/v1/autopilot/enable", {
      method: "POST",
      body: {},
    });
    return AutopilotEnableResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}

export async function disableAutopilot(): Promise<AutopilotDisableResult> {
  if (isFixtureMode()) return fixtureDisableAutopilot();
  try {
    const raw = await apiFetch<unknown>("/api/v1/autopilot/disable", {
      method: "POST",
      body: {},
    });
    return AutopilotDisableResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}
