import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/auth/token";
import { ApiError } from "@/lib/api/errors";
import {
  AdminWaitlistOutSchema,
  PageSchema,
  type AdminWaitlistOut,
  type Page,
} from "@/lib/admin/types";

export interface ListWaitlistParams {
  limit?: number;
  offset?: number;
}

const PageOfWaitlistSchema = PageSchema(AdminWaitlistOutSchema);

export async function listWaitlist(params: ListWaitlistParams = {}): Promise<Page<AdminWaitlistOut>> {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  const data = await apiFetch<unknown>(`/api/v1/admin/waitlist${qs ? `?${qs}` : ""}`);
  return PageOfWaitlistSchema.parse(data);
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
