import { apiFetch } from "@/lib/api/client";
import { CurrentUserSchema, type CurrentUser } from "@/lib/auth/types";

/**
 * Fetch the current authenticated user from the backend.
 * Throws ApiError on failure. 401 is handled inside apiFetch (clears token + redirects).
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const data = await apiFetch<unknown>("/api/v1/auth/me");
  return CurrentUserSchema.parse(data);
}
