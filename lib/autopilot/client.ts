import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isFixtureMode } from "@/lib/today/client";
import {
  fixturePauseAutopilot,
  fixtureResumeAutopilot,
} from "@/lib/today/fixtures";
import {
  AutopilotPauseResultSchema,
  AutopilotResumeResultSchema,
  type AutopilotPauseResult,
  type AutopilotResumeResult,
} from "@/lib/today/types";

/** Pause autopilot indefinitely. Resume is a separate explicit action. */
export async function pauseAutopilot(): Promise<AutopilotPauseResult> {
  if (isFixtureMode()) return fixturePauseAutopilot();
  try {
    const raw = await apiFetch<unknown>("/api/v1/autopilot/pause", {
      method: "POST",
      body: {},
    });
    return AutopilotPauseResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}

/** Resume autopilot. The /preferences toggle in F.8 also calls this. */
export async function resumeAutopilot(): Promise<AutopilotResumeResult> {
  if (isFixtureMode()) return fixtureResumeAutopilot();
  try {
    const raw = await apiFetch<unknown>("/api/v1/autopilot/resume", {
      method: "POST",
      body: {},
    });
    return AutopilotResumeResultSchema.parse(raw);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "unknown", "We hit a snag. Try again in a moment.");
  }
}
