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
  // Backend can also surface these once the send worker / reply ingestor run.
  "failed",
  "replied",
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
  // v0 has no templates table — the backend sends null and renders a hardcoded
  // default body. These go non-null once real templates ship (B5.7+).
  template_id: z.string().nullable(),
  template_name: z.string().nullable(),
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

/** PATCH /api/v1/today/items/{id} body. Any subset of these fields. */
export const TodayItemPatchSchema = z.object({
  status: TodayCardStatusSchema.optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  send_time: z.string().optional(),
  template_id: z.string().optional(),
});
export type TodayItemPatch = z.infer<typeof TodayItemPatchSchema>;

/** POST /api/v1/today/send-batch response. */
export const BatchDispatchResultSchema = z.object({
  dispatched_count: z.number().int().nonnegative(),
  scheduled_first_at: z.string(),
  scheduled_last_at: z.string(),
  /** Server returns a token for the cancel endpoint; not used in F.5b client-side undo. */
  batch_token: z.string().optional(),
});
export type BatchDispatchResult = z.infer<typeof BatchDispatchResultSchema>;

/** POST /api/v1/today/skip response. */
export const SkipTodayResultSchema = z.object({
  skipped: z.literal(true),
});
export type SkipTodayResult = z.infer<typeof SkipTodayResultSchema>;

/** POST /api/v1/autopilot/pause response. */
export const AutopilotPauseResultSchema = z.object({
  paused: z.literal(true),
  paused_at: z.string(),
});
export type AutopilotPauseResult = z.infer<typeof AutopilotPauseResultSchema>;

/** POST /api/v1/autopilot/resume response. */
export const AutopilotResumeResultSchema = z.object({
  paused: z.literal(false),
});
export type AutopilotResumeResult = z.infer<typeof AutopilotResumeResultSchema>;
