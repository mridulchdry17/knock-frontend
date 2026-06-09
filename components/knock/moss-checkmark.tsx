"use client";

import { cn } from "@/lib/utils";

/**
 * Moss-toned checkmark that draws over 600ms via stroke-dashoffset.
 *
 * Reused for post-grant success on `/auth/complete` and (later) first-send
 * celebration in F.5. Pure SVG + CSS animation — no JS timing dependency.
 *
 * Respects `prefers-reduced-motion` via the global rule in app/globals.css
 * (transforms/animations are dampened to opacity-only there).
 */
export function MossCheckmark({
  size = 64,
  className,
  "aria-label": ariaLabel = "Connected",
}: {
  size?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={cn(className)}
    >
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke="var(--moss)"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M18 33 L28 43 L46 23"
        stroke="var(--moss)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="moss-checkmark-path"
      />
      <style>{`
        .moss-checkmark-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: moss-check-draw 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes moss-check-draw {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .moss-checkmark-path {
            stroke-dashoffset: 0;
            animation: none;
          }
        }
      `}</style>
    </svg>
  );
}
