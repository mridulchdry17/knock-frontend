import { z } from "zod";

/**
 * Backend error envelope (locked).
 * { error: { code: string, message: string } }
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiErrorPayload = z.infer<typeof ApiErrorSchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Normalize whatever the upstream returned into an ApiError. Never swallows. */
export function toApiError(status: number, body: unknown): ApiError {
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(status, parsed.data.error.code, parsed.data.error.message);
  }
  if (status === 401) {
    return new ApiError(401, "unauthorized", "Your session ended. Sign in again.");
  }
  // Locked error voice. See microcopy v2.
  return new ApiError(status, "unknown_error", "We hit a snag. Try again in a moment.");
}
