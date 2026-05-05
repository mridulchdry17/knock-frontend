import { z } from "zod";

/**
 * Wire contract for `GET /api/v1/today`. Backend Phase 5 will match this verbatim.
 * Field names use snake_case to mirror the rest of the backend; consumer code
 * stays in the wire shape — we don't transform here.
 */

export const TodayCardStatusSchema = z.enum([
  "default",
  "ready",
  "skipped",
  "sent",
  "cooldown",
  "held",
]);
export type TodayCardStatus = z.infer<typeof TodayCardStatusSchema>;

export const RecipientSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email(),
  role: z.string().nullable(),
  company: z.string(),
  company_domain: z.string(),
  linkedin_url: z.string().url().nullable(),
  avatar_url: z.string().url().nullable().optional(),
});
export type Recipient = z.infer<typeof RecipientSchema>;

export const TodayItemSchema = z.object({
  id: z.string(),
  recipient: RecipientSchema,
  template_id: z.string(),
  template_name: z.string(),
  subject: z.string(),
  body_preview: z.string(),
  body: z.string(),
  send_time: z.string(),
  status: TodayCardStatusSchema,
  cooldown_until: z.string().nullable(),
  sent_at: z.string().nullable(),
});
export type TodayItem = z.infer<typeof TodayItemSchema>;

export const TodayBatchSchema = z.object({
  generated_at: z.string(),
  date: z.string(),
  cap: z.number().int().positive(),
  sent_today: z.number().int().nonnegative(),
  items: z.array(TodayItemSchema),
});
export type TodayBatch = z.infer<typeof TodayBatchSchema>;
