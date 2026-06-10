"use client";

import * as React from "react";
import { ApiError } from "@/lib/api/errors";
import { fetchTemplates } from "@/lib/templates/client";
import type { Template } from "@/lib/templates/types";
import { cn } from "@/lib/utils";

interface BatchTemplatePickerProps {
  /**
   * Applies the chosen template to every pristine (un-edited, non-terminal)
   * card in today's batch. Throws on failure; the parent surfaces the locked
   * snag toast.
   */
  onApply: (templateId: string) => Promise<void>;
  /** Disabled while the parent is mid-load or already applying. */
  disabled?: boolean;
  className?: string;
}

/**
 * Batch-level template picker — sits above the recipient list on /today.
 * Pick a template, every pristine card gets re-rendered server-side. Manual
 * per-card edits are preserved. Hidden if the user has 0 templates.
 */
export function BatchTemplatePicker({
  onApply,
  disabled,
  className,
}: BatchTemplatePickerProps) {
  const [templates, setTemplates] = React.useState<Template[] | null>(null);
  const [applying, setApplying] = React.useState(false);
  const [snag, setSnag] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchTemplates()
      .then((r) => {
        if (cancelled) return;
        setTemplates(r.kind === "list" ? r.data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!templates || templates.length === 0) return null;

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const templateId = e.target.value;
    if (!templateId) return;
    setApplying(true);
    setSnag(null);
    try {
      await onApply(templateId);
    } catch (err) {
      // Surface the actual API message when we have one — generic snags hide
      // real causes (e.g. missing proxy route, expired session, template
      // deleted). Falls back to a friendly default for non-ApiError throws.
      if (err instanceof ApiError && err.message) {
        setSnag(err.message);
      } else {
        setSnag("Couldn't apply that template. Try again.");
      }
    } finally {
      setApplying(false);
      // Reset the select back to its placeholder — this is a verb, not a state.
      e.target.value = "";
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper-2 px-4 py-3",
        className,
      )}
    >
      <span className="text-small text-ink-2">
        Use one template for the whole batch:
      </span>
      <select
        aria-label="Apply template to every card"
        defaultValue=""
        onChange={(e) => void handleChange(e)}
        disabled={disabled || applying}
        className="rounded-sm border border-line-2 bg-paper px-3 py-1.5 text-small text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
      >
        <option value="" disabled>
          {applying ? "Applying…" : "Pick a template…"}
        </option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <span className="text-caption text-ink-3">
        Cards you&apos;ve edited will be left alone.
      </span>
      {snag ? (
        <span role="alert" className="text-caption text-bordeaux">
          {snag}
        </span>
      ) : null}
    </div>
  );
}
