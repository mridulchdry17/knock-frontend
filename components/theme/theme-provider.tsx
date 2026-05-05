"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "knock.theme";
const NUDGE_KEY = "knock.osDarkNudgeDismissed";

/** OS-dark first-session nudge. Locked microcopy. */
const NUDGE_MESSAGE = "Knock is paper-first by design.";
const NUDGE_ACTION = "Switch to dark";

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // ignore
  }
  return null;
}

function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === "system") return prefersDark() ? "dark" : "light";
  return theme;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to "light" — the brand is paper-warm-first even on OS dark.
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const nudgeFiredRef = useRef(false);

  // Initial sync from localStorage on mount, plus OS-dark nudge.
  useEffect(() => {
    const stored = readStoredTheme();
    const initial: Theme = stored ?? "light";
    setThemeState(initial);
    const resolved = resolve(initial);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Defer enabling transitions one frame so the initial theme paint isn't animated.
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });

    // OS-dark first-session nudge: only when no key is stored AND OS is dark
    // AND we haven't already dismissed it.
    if (!stored && prefersDark() && !nudgeFiredRef.current) {
      let dismissed = false;
      try {
        dismissed = window.localStorage.getItem(NUDGE_KEY) === "true";
      } catch {
        // ignore
      }
      if (!dismissed) {
        nudgeFiredRef.current = true;
        toast(NUDGE_MESSAGE, {
          action: {
            label: NUDGE_ACTION,
            onClick: () => {
              try {
                window.localStorage.setItem(STORAGE_KEY, "dark");
                window.localStorage.setItem(NUDGE_KEY, "true");
              } catch {
                // ignore
              }
              setThemeState("dark");
              setResolvedTheme("dark");
              applyTheme("dark");
            },
          },
          onDismiss: () => {
            try {
              window.localStorage.setItem(NUDGE_KEY, "true");
            } catch {
              // ignore
            }
          },
        });
      }
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const resolved = resolve(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // React to OS scheme changes only when in "system" mode.
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = mql.matches ? "dark" : "light";
      setResolvedTheme(r);
      applyTheme(r);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
