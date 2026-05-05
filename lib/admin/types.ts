import { z } from "zod";
import { TierSchema, type Tier } from "@/lib/auth/types";

export { TierSchema };
export type { Tier };

/** Tiers settable via PATCH /admin/users/{id}/tier (excludes "suspended"). */
export const SettableTierSchema = z.enum(["pending", "free", "paid", "super_admin"]);
export type SettableTier = z.infer<typeof SettableTierSchema>;

export const AdminUserOutSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().email(),
  full_name: z.string().nullable().optional().default(null),
  tier: TierSchema,
  waitlist_email: z.string().nullable().optional().default(null),
  is_suspended: z.boolean().default(false),
  has_gmail_connected: z.boolean().default(false),
  created_at: z.string(),
  tier_set_at: z.string().nullable().optional().default(null),
});
export type AdminUserOut = z.infer<typeof AdminUserOutSchema>;

export const AdminWaitlistOutSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().email(),
  created_at: z.string(),
});
export type AdminWaitlistOut = z.infer<typeof AdminWaitlistOutSchema>;

/** Generic Page<T> wrapper for paginated admin endpoints. */
export function PageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  });
}

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
