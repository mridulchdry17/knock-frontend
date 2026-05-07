"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreferencesSectionProps {
  /** Stable section id — used as `<details>` open key on mobile. */
  id: string;
  title: string;
  subtitle?: string;
  /** When true on mobile, this section starts expanded. */
  defaultOpen?: boolean;
  /** Right-aligned slot in the header — used for the "Saved" pill. */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT = "(max-width: 767px)";

/**
 * Section frame that adapts to viewport:
 *  - Desktop (≥768px): always-open block with H2 + content.
 *  - Mobile: collapsible accordion via `<details>` for native a11y + zero-JS
 *    progressive enhancement. First section opens by default.
 *
 * We render the same DOM either way and use a `useEffect` matchMedia probe to
 * decide whether to behave as a `<details>` or a plain `<section>` — this
 * avoids hydration flicker because both share the same outer markup.
 */
export function PreferencesSection({
  id,
  title,
  subtitle,
  defaultOpen = false,
  headerAside,
  children,
}: PreferencesSectionProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const header = (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-h2 text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-small text-ink-3">{subtitle}</p> : null}
      </div>
      {headerAside}
    </div>
  );

  if (isMobile) {
    return (
      <section
        aria-labelledby={`${id}-heading`}
        className="border-b border-line py-6"
      >
        <details open={defaultOpen} className="group">
          <summary
            id={`${id}-heading`}
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-4",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-md",
            )}
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-h2 text-ink">{title}</h2>
              {subtitle ? <p className="mt-1 text-small text-ink-3">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {headerAside}
              <ChevronDown
                size={18}
                aria-hidden
                className="text-ink-3 transition-transform group-open:rotate-180"
              />
            </div>
          </summary>
          <div className="mt-5">{children}</div>
        </details>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="border-b border-line py-8 last:border-b-0"
    >
      <div id={`${id}-heading`}>{header}</div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
