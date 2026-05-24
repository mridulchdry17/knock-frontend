import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { getToken } from "@/lib/auth/token";
import { PageSchema, type Page } from "@/lib/admin/types";

export const AdminContactOutSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string(),
  name: z.string().nullable().optional().default(null),
  role: z.string().nullable().optional().default(null),
  company_id: z.union([z.string(), z.number()]).transform(String),
  company_name: z.string(),
  company_domain: z.string(),
  linkedin_url: z.string().nullable().optional().default(null),
  source: z.string().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
  scraped_pattern: z.string().nullable().optional().default(null),
  is_invalid: z.boolean().default(false),
  invalid_reason: z.string().nullable().optional().default(null),
  created_at: z.string(),
});
export type AdminContactOut = z.infer<typeof AdminContactOutSchema>;

const PageOfContactsSchema = PageSchema(AdminContactOutSchema);

export interface ListContactsParams {
  search?: string;
  company_domain?: string;
  /** When true, only invalidated contacts (bounced / flagged) are returned. */
  invalid_only?: boolean;
  limit?: number;
  offset?: number;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === null || v === false) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listContacts(
  params: ListContactsParams = {},
): Promise<Page<AdminContactOut>> {
  const qs = buildQuery({
    search: params.search,
    company_domain: params.company_domain,
    invalid_only: params.invalid_only,
    limit: params.limit,
    offset: params.offset,
  });
  const data = await apiFetch<unknown>(`/api/v1/admin/contacts${qs}`);
  return PageOfContactsSchema.parse(data);
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/contacts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export const ContactUploadResultSchema = z.object({
  inserted: z.number().int().nonnegative().default(0),
  updated: z.number().int().nonnegative().default(0),
  skipped: z.number().int().nonnegative().default(0),
  failed: z.number().int().nonnegative().default(0),
  row_errors: z
    .array(
      z.object({
        row_index: z.number().int(),
        code: z.string(),
        message: z.string(),
      }),
    )
    .default([]),
});
export type ContactUploadResult = z.infer<typeof ContactUploadResultSchema>;

/**
 * Multipart CSV upload. apiFetch force-sets a JSON Content-Type, which would
 * break the multipart boundary — so we post FormData directly to the proxy
 * route and attach the bearer token ourselves.
 */
export async function uploadContactsCsv(file: File): Promise<ContactUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const token = getToken();
  const res = await fetch("/api/admin/contacts/bulk/csv", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
    cache: "no-store",
  });
  if (!res.ok) {
    throw toApiError(res.status, await res.json().catch(() => null));
  }
  return ContactUploadResultSchema.parse(await res.json());
}
