"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Inline-morph confirm. Spec: row's button morphs into a small inline prompt
 * with [Yes] [Cancel] (and optional reason input). No modal — keeps the row
 * context visible.
 *
 * State machine: idle → confirming → (submitting) → idle (on confirm/cancel).
 * Parent owns the row-removal animation that runs after onConfirm resolves.
 */
export interface InlineConfirmProps {
  /** Label of the trigger button (e.g. "Approve", "Reject"). */
  label: string;
  /** Variant for the trigger. */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /** Tone of the confirmation question, e.g. "Approve user@x.com?". */
  question: string;
  /** Label of the confirm button in confirming state. Defaults to "Yes". */
  confirmLabel?: string;
  /** Show a reason input alongside the confirm/cancel buttons. */
  withReason?: boolean;
  /** Reason input placeholder. */
  reasonPlaceholder?: string;
  /** Async confirm action. Receives the (optional) reason. */
  onConfirm: (reason?: string) => Promise<void>;
  /** Disable everything (e.g. while another row action is busy). */
  disabled?: boolean;
  className?: string;
}

export function InlineConfirm({
  label,
  variant = "secondary",
  question,
  confirmLabel = "Yes",
  withReason = false,
  reasonPlaceholder = "Reason (optional)",
  onConfirm,
  disabled = false,
  className,
}: InlineConfirmProps) {
  const [confirming, setConfirming] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const reasonRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (confirming && withReason) {
      reasonRef.current?.focus();
    }
  }, [confirming, withReason]);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className={className}
      >
        {label}
      </Button>
    );
  }

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(withReason ? reason.trim() || undefined : undefined);
      // Parent typically removes the row; keep state stable here.
    } finally {
      setSubmitting(false);
      setConfirming(false);
      setReason("");
    }
  };

  return (
    <div
      role="group"
      aria-live="polite"
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-md border border-line-2 bg-paper-2 px-2 py-1",
        className,
      )}
    >
      <span className="text-small text-ink">{question}</span>
      {withReason ? (
        <Input
          ref={reasonRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={reasonPlaceholder}
          className="h-8 w-48 text-small"
          aria-label="Reason"
          disabled={submitting}
        />
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={variant === "destructive" ? "destructive" : "primary"}
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? "…" : confirmLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setConfirming(false);
          setReason("");
        }}
        disabled={submitting}
      >
        Cancel
      </Button>
    </div>
  );
}
