import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api/client";
import {
  addExcludedDomain,
  disableAutopilot,
  enableAutopilot,
  fetchExcludedDomains,
  fetchPreferences,
  removeExcludedDomain,
  updatePreferences,
} from "@/lib/preferences/client";
import { __resetPreferenceFixturesForTests } from "@/lib/preferences/fixtures";

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>;
const ORIGINAL_ENV = { ...process.env };

function setFixtureMode(on: boolean) {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_USE_TODAY_FIXTURES: on ? "true" : "false",
  };
}

const livePrefs = {
  target_role: "Recruiter",
  target_industries: ["Tech"],
  target_location: "SF",
  notify_gmail_disconnect: true,
  notify_daily_summary: true,
  autopilot_enabled: false,
  autopilot_paused_at: null,
  autopilot_auto_pause_on_reply: true,
};

describe("preferences client (live mode)", () => {
  beforeEach(() => {
    setFixtureMode(false);
    apiFetchMock.mockReset();
  });

  it("fetchPreferences parses with Zod", async () => {
    apiFetchMock.mockResolvedValueOnce(livePrefs);
    const res = await fetchPreferences();
    expect(res.kind).toBe("loaded");
    if (res.kind === "loaded") {
      expect(res.data.target_role).toBe("Recruiter");
    }
  });

  it("fetchPreferences maps 502 → unavailable", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(502, "upstream_unavailable", "We hit a snag."),
    );
    const res = await fetchPreferences();
    expect(res.kind).toBe("unavailable");
  });

  it("updatePreferences PATCHes the right path with the patch body", async () => {
    apiFetchMock.mockResolvedValueOnce(livePrefs);
    await updatePreferences({ target_role: "Recruiter" });
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/preferences", {
      method: "PATCH",
      body: { target_role: "Recruiter" },
    });
  });

  it("fetchExcludedDomains parses list", async () => {
    apiFetchMock.mockResolvedValueOnce({
      items: [{ domain: "x.com", created_at: "2026-05-01T00:00:00Z" }],
    });
    const res = await fetchExcludedDomains();
    expect(res.kind).toBe("loaded");
    if (res.kind === "loaded") expect(res.data.items[0].domain).toBe("x.com");
  });

  it("addExcludedDomain POSTs to the right path", async () => {
    apiFetchMock.mockResolvedValueOnce({
      domain: "x.com",
      created_at: "2026-05-01T00:00:00Z",
    });
    const out = await addExcludedDomain("x.com");
    expect(out.domain).toBe("x.com");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/preferences/excluded-domains",
      { method: "POST", body: { domain: "x.com" } },
    );
  });

  it("removeExcludedDomain DELETEs the right path", async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);
    await removeExcludedDomain("x.com");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/preferences/excluded-domains/x.com",
      { method: "DELETE" },
    );
  });

  it("enableAutopilot POSTs and parses", async () => {
    apiFetchMock.mockResolvedValueOnce({ autopilot_enabled: true });
    const out = await enableAutopilot();
    expect(out.autopilot_enabled).toBe(true);
  });

  it("disableAutopilot POSTs and parses", async () => {
    apiFetchMock.mockResolvedValueOnce({ autopilot_enabled: false });
    const out = await disableAutopilot();
    expect(out.autopilot_enabled).toBe(false);
  });

  it("addExcludedDomain surfaces 422 invalid_domain as ApiError", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(422, "invalid_domain", "That doesn't look like a valid domain."),
    );
    await expect(addExcludedDomain("not-a-domain")).rejects.toMatchObject({
      code: "invalid_domain",
      status: 422,
    });
  });

  it("addExcludedDomain surfaces 409 already_excluded", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(409, "already_excluded", "Already on your list."),
    );
    await expect(addExcludedDomain("x.com")).rejects.toMatchObject({
      code: "already_excluded",
    });
  });
});

describe("preferences client (fixture mode)", () => {
  beforeEach(() => {
    setFixtureMode(true);
    apiFetchMock.mockReset();
    __resetPreferenceFixturesForTests();
  });

  it("returns deterministic prefs + domains", async () => {
    const p = await fetchPreferences();
    expect(p.kind).toBe("loaded");
    if (p.kind === "loaded") {
      expect(p.data.target_role).toBe("Software Engineer Intern");
      expect(p.data.target_industries).toEqual(["Tech", "Fintech"]);
    }
    const d = await fetchExcludedDomains();
    expect(d.kind).toBe("loaded");
    if (d.kind === "loaded") {
      expect(d.data.items.map((x) => x.domain)).toEqual(["noreply.com", "spam.example"]);
    }
  });

  it("addExcludedDomain rejects malformed domain with 422", async () => {
    await expect(addExcludedDomain("not-a-domain")).rejects.toMatchObject({
      code: "invalid_domain",
      status: 422,
    });
  });

  it("addExcludedDomain rejects duplicate with 409", async () => {
    await expect(addExcludedDomain("noreply.com")).rejects.toMatchObject({
      code: "already_excluded",
      status: 409,
    });
  });

  it("addExcludedDomain accepts valid domain (with @ prefix)", async () => {
    const created = await addExcludedDomain("@new.example");
    expect(created.domain).toBe("new.example");
  });

  it("removeExcludedDomain removes from list", async () => {
    await removeExcludedDomain("noreply.com");
    const d = await fetchExcludedDomains();
    if (d.kind === "loaded") {
      expect(d.data.items.map((x) => x.domain)).not.toContain("noreply.com");
    }
  });

  it("enable/disable autopilot flips state", async () => {
    const e = await enableAutopilot();
    expect(e.autopilot_enabled).toBe(true);
    const d = await disableAutopilot();
    expect(d.autopilot_enabled).toBe(false);
  });

  it("updatePreferences merges the patch", async () => {
    await updatePreferences({ target_role: "PM" });
    const p = await fetchPreferences();
    if (p.kind === "loaded") expect(p.data.target_role).toBe("PM");
  });
});
