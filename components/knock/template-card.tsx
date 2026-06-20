"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  htmlToPreviewText,
  renderWithVariables,
} from "@/components/knock/variable-chip";
import type { Template } from "@/lib/templates/types";

interface TemplateCardProps {
  template: Template;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Toggle this card to be the autopilot default. The parent owns the
   *  network call + optimistic state update; this card just fires the
   *  intent on click. Omit to hide the star (e.g., in views where the
   *  default doesn't apply). */
  onSetDefault?: (id: string) => void;
  className?: string;
}

/**
 * Card surface for a single template in the /templates list.
 *
 * Layout per spec: name + Used X times metric (right), 2-line body preview
 * with variable chips, ghost Edit / Delete actions in the footer. Click
 * anywhere except actions opens the editor; --bordeaux text on Delete hover.
 */
export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  className,
}: TemplateCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card-action]")) return;
    onEdit(template.id);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(template.id);
    }
  };

  const previewText = htmlToPreviewText(template.body);
  const metric = formatMetric(template.used_count, template.reply_rate);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKey}
      data-testid="template-card"
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-[14px] border border-line bg-paper p-card",
        "transition-shadow hover:border-line-2 hover:shadow-xs",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        className,
      )}
      aria-label={`Edit template ${template.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {onSetDefault ? (
            <button
              type="button"
              data-card-action="set-default"
              onClick={(e) => {
                e.stopPropagation();
                if (!template.is_default) onSetDefault(template.id);
              }}
              aria-label={
                template.is_default
                  ? `${template.name} is the autopilot default`
                  : `Make ${template.name} the autopilot default`
              }
              aria-pressed={template.is_default}
              title={
                template.is_default
                  ? "Autopilot uses this template"
                  : "Make autopilot use this template"
              }
              className={cn(
                "shrink-0 rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                template.is_default
                  ? "text-ember"
                  : "text-ink-3 hover:text-ember",
              )}
            >
              <Star
                size={16}
                className={template.is_default ? "fill-ember" : ""}
                aria-hidden
              />
            </button>
          ) : null}
          <h3 className="truncate text-[17px] font-medium leading-6 text-ink">
            {template.name}
          </h3>
          {template.is_default ? (
            <span className="ml-1 inline-flex shrink-0 items-center rounded-pill bg-ember-tint px-1.5 py-0.5 text-caption font-medium text-flint">
              Default
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-small text-ink-3">{metric}</span>
      </div>

      <p className="line-clamp-2 text-small text-ink-2">
        {renderWithVariables(previewText)}
      </p>

      <div className="mt-auto flex items-center justify-between pt-2">
        <Button
          data-card-action="edit"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(template.id)}
        >
          Edit
        </Button>
        <Button
          data-card-action="delete"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(template.id)}
          className="hover:text-bordeaux"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

/**
 * Metric line in the card header. Per spec: "Used X times" by default; only
 * append "· Y% reply rate" once `reply_rate !== null` (backend gates this on
 * ≥10 sends so we don't show noisy single-digit percentages).
 */
function formatMetric(usedCount: number, replyRate: number | null): string {
  const used = `Used ${usedCount} time${usedCount === 1 ? "" : "s"}`;
  if (replyRate === null) return used;
  const pct = Math.round(replyRate * 100);
  return `${used} · ${pct}% reply rate`;
}

export const __TEST__ = { formatMetric };
