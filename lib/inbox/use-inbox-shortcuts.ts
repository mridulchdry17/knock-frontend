"use client";

import { useEffect } from "react";
import type { InboxItem } from "@/lib/inbox/types";

interface UseInboxShortcutsArgs {
  items: InboxItem[];
  selectedId: string | null;
  /** Move selection to a row (does NOT open it). */
  onSelect: (id: string) => void;
  /** Open the currently-highlighted thread. */
  onOpen: (id: string) => void;
  /** Esc — close the currently-open thread (return to list-only). */
  onEscape: () => void;
  /** Show cheatsheet (?). */
  onShowCheatsheet: () => void;
  /** When true, all bindings are disabled (mobile / composer focused). */
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
 * /inbox keyboard navigation: J/K to move within the list, Enter to open
 * the focused thread, Esc to close. Mirrors useTodayShortcuts shape.
 *
 *  - J / K  → next/prev row in the list
 *  - Enter  → open selected thread
 *  - Esc    → close thread / return to list-only
 *  - ?      → cheatsheet
 *
 * No-op while focus is in an editor (composer can type freely) or on
 * coarse-pointer devices (mobile).
 */
export function useInboxShortcuts({
  items,
  selectedId,
  onSelect,
  onOpen,
  onEscape,
  onShowCheatsheet,
  disabled,
}: UseInboxShortcutsArgs): void {
  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (!isFinePointer()) return;

    const handler = (e: KeyboardEvent) => {
      // ? cheatsheet — Shift+/. Skip when focus is in an input.
      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        onShowCheatsheet();
        return;
      }

      // Esc closes the open thread even if focus is in the composer.
      if (e.key === "Escape") {
        if (isTypingTarget(e.target)) return; // editor handles its own Esc
        e.preventDefault();
        onEscape();
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "enter") {
        if (selectedId) {
          e.preventDefault();
          onOpen(selectedId);
        }
        return;
      }
      if (!["j", "k"].includes(k)) return;
      if (items.length === 0) return;

      const idx = selectedId ? items.findIndex((i) => i.id === selectedId) : -1;
      if (k === "j") {
        e.preventDefault();
        const next = idx < 0 ? items[0] : items[Math.min(items.length - 1, idx + 1)];
        if (next) onSelect(next.id);
        return;
      }
      if (k === "k") {
        e.preventDefault();
        const prev = idx <= 0 ? items[0] : items[idx - 1];
        if (prev) onSelect(prev.id);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, selectedId, onSelect, onOpen, onEscape, onShowCheatsheet, disabled]);
}
