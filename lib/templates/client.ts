import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  TemplateSchema,
  TemplatesListSchema,
  TestSendResultSchema,
  type Template,
  type TemplateInput,
  type TemplatePatch,
  type TemplatesResult,
  type TestSendResult,
} from "@/lib/templates/types";
import {
  fixtureCreate,
  fixtureDelete,
  fixtureList,
  fixtureTestSend,
  fixtureUpdate,
} from "@/lib/templates/fixtures";

/**
 * F.6 reuses F.5a's flag (`NEXT_PUBLIC_USE_TODAY_FIXTURES`) — one knob for all
 * fixture data avoids env clutter and keeps starters + today batch in sync
 * during local dev.
 */
export function isFixtureMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_TODAY_FIXTURES === "true";
}

export async function fetchTemplates(): Promise<TemplatesResult> {
  if (isFixtureMode()) {
    return { kind: "list", data: fixtureList() };
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/templates");
    const data = TemplatesListSchema.parse(raw);
    return { kind: "list", data };
  } catch (err) {
    if (err instanceof ApiError) {
      // 502 from proxy = backend Phase 5 not ready yet → calm "Setting up your
      // starter templates…" empty state, same as count=0 server-seed-pending.
      if (err.status === 502) return { kind: "unavailable" };
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new ApiError(0, "unknown", "We hit a snag loading templates."),
    };
  }
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  if (isFixtureMode()) {
    return fixtureCreate(input);
  }
  try {
    const raw = await apiFetch<unknown>("/api/v1/templates", {
      method: "POST",
      body: input,
    });
    return TemplateSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag saving. Try again in a moment.");
  }
}

export async function updateTemplate(
  id: string,
  patch: TemplatePatch,
): Promise<Template> {
  if (isFixtureMode()) {
    return fixtureUpdate(id, patch);
  }
  try {
    const raw = await apiFetch<unknown>(
      `/api/v1/templates/${encodeURIComponent(id)}`,
      { method: "PATCH", body: patch },
    );
    return TemplateSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag saving. Try again in a moment.");
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  if (isFixtureMode()) {
    fixtureDelete(id);
    return;
  }
  try {
    await apiFetch<unknown>(`/api/v1/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}

export async function testSendTemplate(id: string): Promise<TestSendResult> {
  if (isFixtureMode()) {
    return fixtureTestSend(id);
  }
  try {
    const raw = await apiFetch<unknown>(
      `/api/v1/templates/${encodeURIComponent(id)}/test-send`,
      { method: "POST", body: {} },
    );
    return TestSendResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag sending. Try again in a moment.");
  }
}
