import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-md border p-4 text-small",
  {
    variants: {
      tone: {
        info: "border-line-2 bg-paper-2 text-ink",
        warn: "border-ochre/30 bg-ochre-tint text-ink",
        danger: "border-bordeaux/30 bg-bordeaux-tint text-ink",
        success: "border-moss/30 bg-moss-tint text-ink",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export function Alert({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ tone }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-ink-2", className)} {...props} />;
}
