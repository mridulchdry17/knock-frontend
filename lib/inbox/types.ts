import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

/**
 * Wire contract for `/api/v1/inbox`. Backend Phase 5 will match this verbatim.
 * snake_case in the wire shape, no transforms.
 *
 * Categories drive the tab filter:
 *  - "reply"  — recruiter wrote back. Moss tag.
 *  - "bounce" — Gmail SMTP/postmaster bounce. Bordeaux tag.
 *  - "nudge"  — Knock-flagged "follow-up suggested" item. Ochre tag.
 */

export const InboxCategorySchema = z.enum(["reply", "bounce", "nudge"]);
export type InboxCategory = z.infer<typeof InboxCategorySchema>;

/** UI-side tab filter — superset of category with "all". */
export const InboxTabSchema = z.enum(["all", "replies", "bounces", "nudges"]);
export type InboxTab = z.infer<typeof InboxTabSchema>;

export const InboxSenderSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
});
export type InboxSender = z.infer<typeof InboxSenderSchema>;

export const InboxItemSchema = z.object({
  id: z.string(),
  category: InboxCategorySchema,
  subject: z.string(),
  sender: InboxSenderSchema,
  snippet: z.string(),
  last_message_at: z.string(),
  unread: z.boolean(),
  message_count: z.number().int().nonnegative(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

export const InboxListSchema = z.object({
  items: z.array(InboxItemSchema),
  total: z.number().int().nonnegative(),
  unread_count: z.number().int().nonnegative(),
});
export type InboxList = z.infer<typeof InboxListSchema>;

export const ThreadParticipantSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
  role: z.string().nullable(),
  company: z.string().nullable(),
});
export type ThreadParticipant = z.infer<typeof ThreadParticipantSchema>;

export const ThreadMessageSchema = z.object({
  id: z.string(),
  direction: z.enum(["outbound", "inbound"]),
  from: InboxSenderSchema,
  body_html: z.string(),
  sent_at: z.string(),
  is_knock_drafted_followup: z.boolean().optional(),
});
export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;

export const SuggestedFollowupSchema = z.object({
  subject: z.string(),
  body_html: z.string(),
  reason: z.string(),
});
export type SuggestedFollowup = z.infer<typeof SuggestedFollowupSchema>;

export const ThreadDetailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  category: InboxCategorySchema,
  sender: ThreadParticipantSchema,
  messages: z.array(ThreadMessageSchema),
  suggested_followup: SuggestedFollowupSchema.nullable(),
});
export type ThreadDetail = z.infer<typeof ThreadDetailSchema>;

export const ReplyResultSchema = z.object({
  ok: z.literal(true),
  message_id: z.string(),
});
export type ReplyResult = z.infer<typeof ReplyResultSchema>;

export const SyncStatusSchema = z.object({
  healthy: z.boolean(),
  last_synced_at: z.string().nullable(),
});
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/**
 * Discriminated load result for the inbox list.
 *
 *  - `list`: backend returned a list (may be empty).
 *  - `unavailable`: 502 (proxy upstream not ready) — same calm "All caught up."
 *    state as count=0.
 *  - `error`: any other 4xx/5xx — caller renders the locked snag banner.
 */
export type InboxListResult =
  | { kind: "list"; data: InboxList }
  | { kind: "unavailable" }
  | { kind: "error"; error: ApiError };

export type ThreadDetailResult =
  | { kind: "thread"; data: ThreadDetail }
  | { kind: "unavailable" }
  | { kind: "error"; error: ApiError };

export const TAB_TO_CATEGORY: Record<InboxTab, InboxCategory | null> = {
  all: null,
  replies: "reply",
  bounces: "bounce",
  nudges: "nudge",
};
