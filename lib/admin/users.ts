import { apiFetch } from "@/lib/api/client";
import {
  AdminUserOutSchema,
  PageSchema,
  type AdminUserOut,
  type Page,
  type SettableTier,
  type Tier,
} from "@/lib/admin/types";

/** Tabs in the admin users UI translate to backend filters. */
export type UsersTab = "pending" | "free" | "paid" | "suspended" | "all";

export interface ListUsersParams {
  /** Backend `?tier=` filter. Tab=suspended uses ?tier=pending then client-side filters by is_suspended. */
  tier?: Tier;
  search?: string;
  limit?: number;
  offset?: number;
}

const PageOfUsersSchema = PageSchema(AdminUserOutSchema);

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === null) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listUsers(params: ListUsersParams = {}): Promise<Page<AdminUserOut>> {
  const qs = buildQuery({
    tier: params.tier,
    search: params.search,
    limit: params.limit,
    offset: params.offset,
  });
  const data = await apiFetch<unknown>(`/api/v1/admin/users${qs}`);
  return PageOfUsersSchema.parse(data);
}

export async function getUser(id: string): Promise<AdminUserOut> {
  const data = await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(id)}`);
  return AdminUserOutSchema.parse(data);
}

export async function updateTier(id: string, tier: SettableTier): Promise<AdminUserOut> {
  const data = await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(id)}/tier`, {
    method: "PATCH",
    body: { tier },
  });
  return AdminUserOutSchema.parse(data);
}

export async function suspendUser(id: string, reason?: string): Promise<AdminUserOut> {
  // Reason is captured for audit; backend may currently ignore but we forward it
  // so future schema changes are a no-op on the client.
  const data = await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    body: reason ? { reason } : undefined,
  });
  return AdminUserOutSchema.parse(data);
}

export async function unsuspendUser(id: string): Promise<AdminUserOut> {
  const data = await apiFetch<unknown>(`/api/v1/admin/users/${encodeURIComponent(id)}/unsuspend`, {
    method: "POST",
  });
  return AdminUserOutSchema.parse(data);
}
