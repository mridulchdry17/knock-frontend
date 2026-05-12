import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/preferences/client", () => ({
  fetchPreferences: vi.fn(),
  fetchExcludedDomains: vi.fn(),
  updatePreferences: vi.fn(),
  addExcludedDomain: vi.fn(),
  removeExcludedDomain: vi.fn(),
  enableAutopilot: vi.fn(),
  disableAutopilot: vi.fn(),
}));

import {
  fetchPreferences,
  fetchExcludedDomains,
  updatePreferences,
  addExcludedDomain,
  removeExcludedDomain,
  enableAutopilot,
  disableAutopilot,
} from "@/lib/preferences/client";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { ApiError } from "@/lib/api/errors";

const fetchPrefsMock = fetchPreferences as unknown as ReturnType<typeof vi.fn>;
const fetchDomainsMock = fetchExcludedDomains as unknown as ReturnType<typeof vi.fn>;
const updateMock = updatePreferences as unknown as ReturnType<typeof vi.fn>;
const addMock = addExcludedDomain as unknown as ReturnType<typeof vi.fn>;
const removeMock = removeExcludedDomain as unknown as ReturnType<typeof vi.fn>;
const enableMock = enableAutopilot as unknown as ReturnType<typeof vi.fn>;
const disableMock = disableAutopilot as unknown as ReturnType<typeof vi.fn>;

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

describe("usePreferences", () => {
  beforeEach(() => {
    vi.useRealTimers();
    fetchPrefsMock.mockReset();
    fetchDomainsMock.mockReset();
    updateMock.mockReset();
    addMock.mockReset();
    removeMock.mockReset();
    enableMock.mockReset();
    disableMock.mockReset();
  });

  it("loads prefs + domains and exposes ready status", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({
      kind: "loaded",
      data: { items: [{ domain: "x.com", created_at: "2026-05-01T00:00:00Z" }] },
    });
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.prefs.target_role).toBe("Recruiter");
    expect(result.current.excludedDomains).toHaveLength(1);
  });

  it("debounces update + flushes via flush()", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items: [] } });
    updateMock.mockResolvedValue({ ...livePrefs, target_role: "PM" });

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.mutations.update({ target_role: "PM" });
    });
    // Optimistic local merge — server not called yet (debounce still ticking).
    expect(result.current.prefs.target_role).toBe("PM");
    expect(updateMock).not.toHaveBeenCalled();

    // Flush short-circuits the debounce timer.
    await act(async () => {
      await result.current.mutations.flush();
    });
    expect(updateMock).toHaveBeenCalledWith({ target_role: "PM" });
    await waitFor(() => expect(result.current.saveState).toBe("saved"));
  });

  it("rolls back update on server failure", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items: [] } });
    updateMock.mockRejectedValueOnce(new ApiError(500, "boom", "Boom."));

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      result.current.mutations.update({ target_role: "PM" });
    });
    expect(result.current.prefs.target_role).toBe("PM");

    await act(async () => {
      await result.current.mutations.flush().catch(() => {});
    });
    await waitFor(() => expect(result.current.prefs.target_role).toBe("Recruiter"));
  });

  it("addDomain appends only on success", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items: [] } });
    addMock.mockResolvedValueOnce({ domain: "y.com", created_at: "2026-05-01T00:00:00Z" });

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.mutations.addDomain("y.com");
    });
    expect(result.current.excludedDomains.map((d) => d.domain)).toEqual(["y.com"]);
  });

  it("removeDomain rolls back on failure", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({
      kind: "loaded",
      data: { items: [{ domain: "x.com", created_at: "2026-05-01T00:00:00Z" }] },
    });
    removeMock.mockRejectedValueOnce(new ApiError(500, "boom", "Boom."));

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.mutations
        .removeDomain("x.com")
        .catch(() => {});
    });
    expect(result.current.excludedDomains.map((d) => d.domain)).toEqual(["x.com"]);
  });

  it("enableAutopilot flips optimistically", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: livePrefs });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items: [] } });
    enableMock.mockResolvedValueOnce({ autopilot_enabled: true });

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.mutations.enableAutopilot();
    });
    expect(result.current.prefs.autopilot_enabled).toBe(true);
  });

  it("disableAutopilot rolls back on failure", async () => {
    fetchPrefsMock.mockResolvedValueOnce({
      kind: "loaded",
      data: { ...livePrefs, autopilot_enabled: true },
    });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items: [] } });
    disableMock.mockRejectedValueOnce(new ApiError(500, "boom", "Boom."));

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.mutations
        .disableAutopilot()
        .catch(() => {});
    });
    expect(result.current.prefs.autopilot_enabled).toBe(true);
  });

  it("502 unavailable falls back to defaults but stays ready", async () => {
    fetchPrefsMock.mockResolvedValueOnce({ kind: "unavailable" });
    fetchDomainsMock.mockResolvedValueOnce({ kind: "unavailable" });
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.prefs.notify_gmail_disconnect).toBe(true);
    expect(result.current.excludedDomains).toEqual([]);
  });
});
