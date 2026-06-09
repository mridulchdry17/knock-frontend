import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

/**
 * Wire contract for `/api/v1/preferences`. Backend Phase 5 will match this
 * verbatim. snake_case in the wire shape, no transforms.
 *
 * The same shape is returned by GET and PATCH. PATCH accepts any subset of
 * the writable fields (everything except autopilot_enabled / autopilot_paused_at,
 * which mutate via dedicated endpoints).
 */

export const PreferencesSchema = z.object({
  // Sender preferences
  target_role: z.string().nullable(),
  target_industries: z.array(z.string()),
  target_location: z.string().nullable(),

  // Notification preferences
  notify_gmail_disconnect: z.boolean(),
  notify_daily_summary: z.boolean(),

  // Autopilot
  autopilot_enabled: z.boolean(),
  autopilot_paused_at: z.string().nullable(),
  autopilot_auto_pause_on_reply: z.boolean(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

/** Fields the user can update via PATCH /preferences (all autopilot toggles
 * except enable/disable, which are dedicated endpoints). */
export const PreferencesPatchSchema = z
  .object({
    target_role: z.string().nullable(),
    target_industries: z.array(z.string()),
    target_location: z.string().nullable(),
    notify_gmail_disconnect: z.boolean(),
    notify_daily_summary: z.boolean(),
    autopilot_auto_pause_on_reply: z.boolean(),
  })
  .partial();
export type PreferencesPatch = z.infer<typeof PreferencesPatchSchema>;

export const ExcludedDomainSchema = z.object({
  domain: z.string(),
  created_at: z.string(),
});
export type ExcludedDomain = z.infer<typeof ExcludedDomainSchema>;

export const ExcludedDomainsListSchema = z.object({
  items: z.array(ExcludedDomainSchema),
});
export type ExcludedDomainsList = z.infer<typeof ExcludedDomainsListSchema>;

export const AutopilotEnableResultSchema = z.object({
  autopilot_enabled: z.literal(true),
});
export type AutopilotEnableResult = z.infer<typeof AutopilotEnableResultSchema>;

export const AutopilotDisableResultSchema = z.object({
  autopilot_enabled: z.literal(false),
});
export type AutopilotDisableResult = z.infer<typeof AutopilotDisableResultSchema>;

/**
 * Discriminated load result for /preferences. 502 (backend Phase 5 not ready)
 * → graceful "unavailable" — page renders with sensible defaults so anxious
 * users still see structure rather than a snag banner.
 */
export type PreferencesResult =
  | { kind: "loaded"; data: Preferences }
  | { kind: "unavailable" }
  | { kind: "error"; error: ApiError };

export type ExcludedDomainsResult =
  | { kind: "loaded"; data: ExcludedDomainsList }
  | { kind: "unavailable" }
  | { kind: "error"; error: ApiError };

/** Defaults applied when GET /preferences is 502 or absent — keeps the UI
 * in a known good state until the backend lands. */
export const DEFAULT_PREFERENCES: Preferences = {
  target_role: null,
  target_industries: [],
  target_location: null,
  notify_gmail_disconnect: true,
  notify_daily_summary: true,
  autopilot_enabled: false,
  autopilot_paused_at: null,
  autopilot_auto_pause_on_reply: true,
};
