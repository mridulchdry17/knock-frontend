"use client";

import * as React from "react";
import { KeyboardShortcutsDialog } from "@/components/knock/keyboard-shortcuts-dialog";

interface GlobalShortcutsContextValue {
  openShortcuts: () => void;
}

const GlobalShortcutsContext = React.createContext<GlobalShortcutsContextValue | null>(
  null,
);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function hasFinePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * Mounts the keyboard cheat sheet once at the app shell level. Any descendant
 * can open it via useGlobalShortcuts(). `?` opens it globally on devices with
 * a fine pointer (mobile is intentionally excluded — no physical keyboard).
 */
export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hasFinePointer()) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = React.useMemo<GlobalShortcutsContextValue>(
    () => ({ openShortcuts: () => setOpen(true) }),
    [],
  );

  return (
    <GlobalShortcutsContext.Provider value={value}>
      {children}
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </GlobalShortcutsContext.Provider>
  );
}

export function useGlobalShortcuts(): GlobalShortcutsContextValue {
  const ctx = React.useContext(GlobalShortcutsContext);
  // Allow callers outside the provider (e.g. tests, public routes) to no-op.
  return ctx ?? { openShortcuts: () => {} };
}
