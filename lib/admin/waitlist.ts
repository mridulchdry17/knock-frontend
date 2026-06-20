import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/auth/token";
import { ApiError } from "@/lib/api/errors";
import {
  AdminWaitlistOutSchema,
  PageSchema,
  type AdminWaitlistOut,
  type Page,
} from "@/lib/admin/types";

export type WaitlistStatus = "pending" | "approved" | "all";
export type WaitlistSort = "newest" | "oldest";

export interface ListWaitlistParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: WaitlistStatus;
  sort?: WaitlistSort;
}

const PageOfWaitlistSchema = PageSchema(AdminWaitlistOutSchema);

export async function listWaitlist(
  params: ListWaitlistParams = {},
): Promise<Page<AdminWaitlistOut>> {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  const data = await apiFetch<unknown>(
    `/api/v1/admin/waitlist${qs ? `?${qs}` : ""}`,
  );
  return PageOfWaitlistSchema.parse(data);
}

const BulkApproveResultSchema = z.object({
  newly_approved: z.number().int().nonnegative(),
  already_approved: z.number().int().nonnegative(),
  not_found_ids: z.array(z.number().int()),
});

export type BulkApproveResult = z.infer<typeof BulkApproveResultSchema>;

/** Approve N waitlist entries in one call. Idempotent on already-approved
 *  rows (they count toward `already_approved`, not `newly_approved`). */
export async function bulkApproveWaitlist(
  ids: number[],
  tier: "free" | "paid" = "free",
): Promise<BulkApproveResult> {
  const data = await apiFetch<unknown>(
    "/api/v1/admin/waitlist/approve-bulk",
    { method: "POST", body: { ids, tier } },
  );
  return BulkApproveResultSchema.parse(data);
}

/** Allow a waitlist entry in. `tier='paid'` pre-marks the entry so the user
 *  lands at 'paid' on sign-in (or gets bumped to paid now if already linked);
 *  default `tier='free'` is the regular Allow flow. Returns the updated entry. */
export async function approveWaitlist(
  id: string,
  tier: "free" | "paid" = "free",
): Promise<AdminWaitlistOut> {
  const data = await apiFetch<unknown>(
    `/api/v1/admin/waitlist/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: { tier } },
  );
  return AdminWaitlistOutSchema.parse(data);
}

/** Undo an approval (clears approved_at; parks a linked free account back at
 *  pending). Returns the updated entry. */
export async function revokeWaitlist(id: string): Promise<AdminWaitlistOut> {
  const data = await apiFetch<unknown>(
    `/api/v1/admin/waitlist/${encodeURIComponent(id)}/revoke`,
    { method: "POST", body: {} },
  );
  return AdminWaitlistOutSchema.parse(data);
}

/**
 * Trigger a CSV download in the browser. Uses fetch (not apiFetch) because the
 * response body is a streaming binary blob, not JSON. We still go through the
 * same-origin proxy at /api/admin/waitlist.csv.
 */
export async function downloadWaitlistCsv(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadWaitlistCsv must be called in the browser");
  }
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch("/api/admin/waitlist.csv", {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, "csv_failed", "We hit a snag downloading the CSV.");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const cd = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const filename = match?.[1] ?? "waitlist.csv";

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
