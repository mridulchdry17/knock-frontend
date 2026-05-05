import { z } from "zod";

export const TierSchema = z.enum(["pending", "free", "paid", "super_admin", "suspended"]);
export type Tier = z.infer<typeof TierSchema>;

/**
 * `/api/v1/auth/me` response. Field names mirror the backend (Phase 4 contract):
 *   { id, email, full_name, tier, onboarded, has_gmail_connected, daily_limit, sent_today }
 *
 * We surface them under camelCase aliases the frontend already uses (`name`,
 * `gmail_connected`) by transforming during parse — keeping the rest of the app
 * unchanged while staying truthful to the wire format.
 */
export const CurrentUserSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    email: z.string().email(),
    full_name: z.string().nullable().optional(),
    tier: TierSchema,
    onboarded: z.boolean().default(false),
    has_gmail_connected: z.boolean().default(false),
    daily_limit: z.number().int().nonnegative().optional(),
    sent_today: z.number().int().nonnegative().optional(),
  })
  .transform((u): CurrentUser => {
    const out: CurrentUser = {
      id: u.id,
      email: u.email,
      name: u.full_name ?? null,
      tier: u.tier,
      onboarded: u.onboarded,
      gmail_connected: u.has_gmail_connected,
    };
    if (u.daily_limit !== undefined) out.daily_limit = u.daily_limit;
    if (u.sent_today !== undefined) out.sent_today = u.sent_today;
    return out;
  });

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  onboarded: boolean;
  gmail_connected: boolean;
  daily_limit?: number;
  sent_today?: number;
}

export const OnboardingStatusSchema = z.object({
  tier: TierSchema,
  waitlist_email: z.string().nullable().optional(),
  onboarded: z.boolean(),
});

export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
