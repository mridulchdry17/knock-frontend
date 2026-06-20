"use client";

import * as React from "react";

/**
 * Attaches a ref to a scrollable element and reports whether a bottom-fade
 * affordance should be shown.
 *
 * `showBottomFade` is true iff `scrollHeight > clientHeight` (the element
 * actually overflows) AND the user hasn't scrolled to the bottom yet. Bind it
 * to a CSS mask-image or gradient overlay so the user gets a visual "there's
 * more below" hint without a permanently-clipped last item.
 *
 * Recomputes on:
 *   - the element's own scroll events
 *   - the element resizing (window resize, layout reflow) — via ResizeObserver
 *   - the caller's `deps` changing (typically a list length)
 *
 * Pattern is needed on /today's roster, /inbox list, and admin tables — the
 * macOS overlay scrollbar hides the affordance by default, and at-rest a
 * column with internal scroll looks indistinguishable from a column that
 * just ends. Extracted as a hook so those three sites stay in lockstep.
 */
export function useScrollFade<T extends HTMLElement = HTMLElement>(
  deps: readonly unknown[] = [],
): { ref: React.RefObject<T>; showBottomFade: boolean } {
  // useRef<T>(null) — passing `null` as the initial value picks the overload
  // that returns RefObject<T> (non-nullable T), which is what JSX `ref={…}`
  // expects. Don't widen to `T | null` here; that breaks consumers.
  const ref = React.useRef<T>(null);
  const [showBottomFade, setShowBottomFade] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      // Sub-pixel slack: browsers can report fractional scrollTop / clientHeight,
      // so "within 4px of the end" is treated as at-bottom — otherwise the fade
      // flickers on the last scroll tick.
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
      setShowBottomFade(overflowing && !atBottom);
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, showBottomFade };
}

/**
 * Inline-style helper that produces the mask-image declarations for a bottom
 * fade. Use with `useScrollFade`:
 *
 *   const { ref, showBottomFade } = useScrollFade([items.length]);
 *   <div ref={ref} style={bottomFadeStyle(showBottomFade)} />
 *
 * `paddingPx` controls how tall the fade is (default 40px — about half a row).
 * WebkitMaskImage is included so Safari ≤ 15 still renders the effect.
 */
export function bottomFadeStyle(
  active: boolean,
  paddingPx = 40,
): React.CSSProperties | undefined {
  if (!active) return undefined;
  const mask = `linear-gradient(to bottom, black calc(100% - ${paddingPx}px), transparent)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}
