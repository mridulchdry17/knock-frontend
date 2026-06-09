import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

/**
 * Wire contract for `/api/v1/templates`. Backend Phase 5 will match this
 * verbatim. snake_case in the wire shape, no transforms.
 *
 * 3-template ceiling: locked product decision. The list response includes
 * `count` and `cap`; UI uses `count >= cap` to disable the New button and
 * show the "1 of 3" pill.
 */

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  is_starter: z.boolean(),
  used_count: z.number().int().nonnegative(),
  reply_rate: z.number().min(0).max(1).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Template = z.infer<typeof TemplateSchema>;

export const TemplatesListSchema = z.object({
  items: z.array(TemplateSchema),
  count: z.number().int().nonnegative(),
  cap: z.number().int().positive(),
});
export type TemplatesList = z.infer<typeof TemplatesListSchema>;

/** Body for POST/PATCH. PATCH allows any subset; POST requires all three. */
export const TemplateInputSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type TemplateInput = z.infer<typeof TemplateInputSchema>;
export type TemplatePatch = Partial<TemplateInput>;

export const TestSendResultSchema = z.object({
  sent: z.literal(true),
});
export type TestSendResult = z.infer<typeof TestSendResultSchema>;

/**
 * Discriminated load result for the templates list.
 *
 *  - `list`: backend returned a list (may be empty).
 *  - `unavailable`: 502 (proxy upstream not ready) — same calm "Setting up your
 *    starter templates…" empty state as count=0.
 *  - `error`: any other failure — caller renders the locked snag banner.
 */
export type TemplatesResult =
  | { kind: "list"; data: TemplatesList }
  | { kind: "unavailable" }
  | { kind: "error"; error: ApiError };
