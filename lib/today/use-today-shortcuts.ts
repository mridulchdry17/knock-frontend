"use client";

import { useEffect } from "react";
import type { TodayItem } from "@/lib/today/types";

interface UseTodayShortcutsArgs {
  items: TodayItem[];
  activeId: string | null;
  /** Move focus to a card by id (smooth scroll + ring). */
  onFocusCard: (id: string) => void;
  /** Toggle ready (R). */
  onToggleReady: (id: string) => void;
  /** Toggle skipped (S). */
  onToggleSkipped: (id: string) => void;
  /** Open inline editor (E). */
  onOpenEditor: (id: string) => void;
  /** Show cheatsheet dialog (?). */
  onShowCheatsheet: () => void;
  /** Cmd+Enter / Ctrl+Enter — fire send-batch. Caller validates readyCount > 0. */
  onSendBatch: () => void;
  /** When true, all bindings are disabled (mobile / editor open). */
  disabled?: boolean;
}

function isFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(pointer: fine)").matches;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Bind J/K/R/S/E/?/Cmd+Enter on the document. Mobile-disabled (coarse pointer).
 * Bindings no-op while focus is in an input/textarea/select/contenteditable
 * (so editor users can type freely) or when `disabled` is true.
 */
export function useTodayShortcuts({
  items,
  activeId,
  onFocusCard,
  onToggleReady,
  onToggleSkipped,
  onOpenEditor,
  onShowCheatsheet,
  onSendBatch,
  disabled,
}: UseTodayShortcutsArgs): void {
  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (!isFinePointer()) return;

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // Cmd+Enter / Ctrl+Enter — send batch.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSendBatch();
        return;
      }

      // ? cheatsheet — needs Shift+/ on most keyboards.
      if (e.key === "?") {
        e.preventDefault();
        onShowCheatsheet();
        return;
      }

      const k = e.key.toLowerCase();
      if (!["j", "k", "r", "s", "e"].includes(k)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = activeId ? items.findIndex((i) => i.id === activeId) : -1;
      const cur = idx >= 0 ? items[idx] : null;

      if (k === "j") {
        e.preventDefault();
        const next = idx < 0 ? items[0] : items[Math.min(items.length - 1, idx + 1)];
        if (next) onFocusCard(next.id);
        return;
      }
      if (k === "k") {
        e.preventDefault();
        const prev = idx <= 0 ? items[0] : items[idx - 1];
        if (prev) onFocusCard(prev.id);
        return;
      }
      if (!cur) return;

      // Sent / cooldown / held cards are not interactable via keyboard.
      if (cur.status === "sent" || cur.status === "cooldown" || cur.status === "held") return;

      if (k === "r") {
        e.preventDefault();
        onToggleReady(cur.id);
        return;
      }
      if (k === "s") {
        e.preventDefault();
        onToggleSkipped(cur.id);
        return;
      }
      if (k === "e") {
        e.preventDefault();
        onOpenEditor(cur.id);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    items,
    activeId,
    onFocusCard,
    onToggleReady,
    onToggleSkipped,
    onOpenEditor,
    onShowCheatsheet,
    onSendBatch,
    disabled,
  ]);
}
