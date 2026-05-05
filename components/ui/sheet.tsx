"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-anchored side sheet built on Radix Dialog (no extra dep).
 * Used for the user detail panel at lg+. On mobile we navigate to a full page
 * instead, so this component is fine staying lg-only in practice.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function SheetContent({ className, children, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line-2 bg-paper shadow-md",
          "focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 text-ink-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
        >
          <X size={16} aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-line p-card", className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-card", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2 border-t border-line p-card sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn("text-h2 text-ink", className)}
      {...props}
    />
  );
});

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("mt-1 text-small text-ink-2", className)}
      {...props}
    />
  );
});
