import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTodayShortcuts } from "@/lib/today/use-today-shortcuts";
import type { TodayItem } from "@/lib/today/types";

function makeItem(overrides: Partial<TodayItem> = {}): TodayItem {
  return {
    id: "c1",
    recipient: {
      name: "Sarah",
      email: "s@x.co",
      role: "R",
      company: "Stripe",
      company_domain: "stripe.com",
      linkedin_url: null,
    },
    template_id: "t1",
    template_name: "Recruiter intro",
    subject: "Hi",
    body_preview: "Hi",
    body: "Hi",
    send_time: "2026-05-05T09:42:00Z",
    status: "default",
    cooldown_until: null,
    sent_at: null,
    ...overrides,
  };
}

function mockFinePointer(matches = true) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("pointer: fine") ? matches : false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
    onchange: null,
  }));
  // matchMedia is on window, not global, in jsdom — ensure window has it too.
  // jsdom uses globalThis.window === globalThis.
  // Above stubGlobal handles window.matchMedia in jsdom env.
}

describe("useTodayShortcuts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFinePointer(true);
  });

  it("J focuses next card", () => {
    const items = [makeItem({ id: "a" }), makeItem({ id: "b" }), makeItem({ id: "c" })];
    const onFocusCard = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard,
        onToggleReady: vi.fn(),
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    expect(onFocusCard).toHaveBeenCalledWith("b");
  });

  it("K focuses previous card", () => {
    const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
    const onFocusCard = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "b",
        onFocusCard,
        onToggleReady: vi.fn(),
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(onFocusCard).toHaveBeenCalledWith("a");
  });

  it("R triggers toggle ready on focused card", () => {
    const items = [makeItem({ id: "a" })];
    const onToggleReady = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady,
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
    expect(onToggleReady).toHaveBeenCalledWith("a");
  });

  it("E opens editor", () => {
    const items = [makeItem({ id: "a" })];
    const onOpenEditor = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady: vi.fn(),
        onToggleSkipped: vi.fn(),
        onOpenEditor,
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    expect(onOpenEditor).toHaveBeenCalledWith("a");
  });

  it("? opens cheatsheet", () => {
    const onShowCheatsheet = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items: [],
        activeId: null,
        onFocusCard: vi.fn(),
        onToggleReady: vi.fn(),
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet,
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    expect(onShowCheatsheet).toHaveBeenCalled();
  });

  it("Cmd+Enter fires send-batch", () => {
    const onSendBatch = vi.fn();
    renderHook(() =>
      useTodayShortcuts({
        items: [],
        activeId: null,
        onFocusCard: vi.fn(),
        onToggleReady: vi.fn(),
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch,
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true }));
    expect(onSendBatch).toHaveBeenCalled();
  });

  it("ignores keys when typing in an input", () => {
    const onToggleReady = vi.fn();
    const items = [makeItem({ id: "a" })];
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady,
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
    expect(onToggleReady).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("disabled flag prevents binding", () => {
    const onToggleReady = vi.fn();
    const items = [makeItem({ id: "a" })];
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady,
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
        disabled: true,
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
    expect(onToggleReady).not.toHaveBeenCalled();
  });

  it("does not bind on coarse pointer (mobile)", () => {
    mockFinePointer(false);
    const onToggleReady = vi.fn();
    const items = [makeItem({ id: "a" })];
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady,
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
    expect(onToggleReady).not.toHaveBeenCalled();
  });

  it("R no-ops on a sent card", () => {
    const onToggleReady = vi.fn();
    const items = [makeItem({ id: "a", status: "sent" })];
    renderHook(() =>
      useTodayShortcuts({
        items,
        activeId: "a",
        onFocusCard: vi.fn(),
        onToggleReady,
        onToggleSkipped: vi.fn(),
        onOpenEditor: vi.fn(),
        onShowCheatsheet: vi.fn(),
        onSendBatch: vi.fn(),
      }),
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
    expect(onToggleReady).not.toHaveBeenCalled();
  });
});
