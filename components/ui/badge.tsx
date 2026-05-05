import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      tone: {
        neutral: "border-line-2 bg-paper-2 text-ink-2",
        ember: "border-transparent bg-ember-tint text-flint",
        moss: "border-transparent bg-moss-tint text-moss",
        ochre: "border-transparent bg-ochre-tint text-ochre",
        bordeaux: "border-transparent bg-bordeaux-tint text-bordeaux",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
