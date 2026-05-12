"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * 2px Flint hairline at the very top of the viewport. Animates a "tape
 * progress" pattern on every route transition (Linear/Vercel style).
 *
 * Implementation notes:
 * - App Router gives us pathname changes synchronously after navigation
 *   resolves. We detect a change, slide to ~80% over 600ms, then complete +
 *   fade out. Subtle, reassuring during transitions.
 * - prefers-reduced-motion: skip transforms; just show a static bar that
 *   appears + disappears via opacity (≤100ms).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const previous = React.useRef<string | null>(null);
  const [phase, setPhase] = React.useState<"idle" | "running" | "complete">("idle");

  React.useEffect(() => {
    if (previous.current === null) {
      previous.current = pathname;
      return;
    }
    if (previous.current === pathname) return;
    previous.current = pathname;

    setPhase("running");
    // Resolve to "complete" on the next frame so transitions kick in.
    const t1 = window.setTimeout(() => setPhase("complete"), 80);
    const t2 = window.setTimeout(() => setPhase("idle"), 480);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  const visible = phase !== "idle";
  // running: ~80% width; complete: 100% then fade.
  const widthClass = phase === "complete" ? "w-full" : phase === "running" ? "w-4/5" : "w-0";
  const opacityClass = phase === "complete" ? "opacity-0" : visible ? "opacity-100" : "opacity-0";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]"
      data-testid="route-progress"
      data-phase={phase}
    >
      <div
        className={cn(
          "h-full bg-flint motion-safe:transition-[width,opacity]",
          "motion-safe:duration-[600ms] motion-safe:ease-out",
          // Reduced motion: instant width, fast 100ms opacity only.
          "motion-reduce:transition-opacity motion-reduce:duration-100",
          "motion-reduce:w-full",
          widthClass,
          opacityClass,
        )}
      />
    </div>
  );
}
