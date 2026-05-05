import { z } from "zod";

export const TierSchema = z.enum(["pending", "free", "paid", "super_admin", "suspended"]);
export type Tier = z.infer<typeof TierSchema>;

export const CurrentUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  tier: TierSchema,
  onboarded: z.boolean().default(false),
  gmail_connected: z.boolean().default(false),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
