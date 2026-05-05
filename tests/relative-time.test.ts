import { describe, it, expect } from "vitest";
import { relativeTime } from "@/lib/format/relative-time";

const NOW = new Date("2025-05-05T12:00:00Z");

describe("relativeTime", () => {
  it("returns '—' for null/undefined", () => {
    expect(relativeTime(null, NOW)).toBe("—");
    expect(relativeTime(undefined, NOW)).toBe("—");
  });

  it("formats minutes / hours / days", () => {
    expect(relativeTime("2025-05-05T11:55:00Z", NOW)).toBe("5m ago");
    expect(relativeTime("2025-05-05T09:00:00Z", NOW)).toBe("3h ago");
    expect(relativeTime("2025-05-03T12:00:00Z", NOW)).toBe("2d ago");
  });

  it("falls back to absolute date for older entries", () => {
    const out = relativeTime("2024-12-01T00:00:00Z", NOW);
    expect(out).not.toBe("—");
    // Don't assert exact format (locale-dependent), just that it's a non-relative string.
    expect(/ago|just now/.test(out)).toBe(false);
  });
});
