import * as React from "react";
import { cn } from "@/lib/utils";

interface VariableChipProps {
  /** Variable name without braces (e.g., "first_name"). */
  name: string;
  className?: string;
}

/**
 * Read-only inline chip rendering a `{{variable}}` token. Used in card
 * previews, the editor preview pane, and anywhere variable text is shown to
 * the user without being editable.
 *
 * Mono font, --ember-tint bg, --flint text, 4px radius (per spec). Tiptap's
 * editable Variable node (lib/templates/tiptap-variable.ts) renders into the
 * same visual unit so chips look identical inside and outside the editor.
 */
export function VariableChip({ name, className }: VariableChipProps) {
  return (
    <span
      data-variable={name}
      className={cn(
        "inline-flex items-center rounded-sm bg-ember-tint px-1 py-[2px] font-mono text-[12px] text-flint",
        className,
      )}
    >
      {`{{${name}}}`}
    </span>
  );
}

const VAR_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Split a plain-text string into an array of strings + chip nodes.
 *
 * Used by callers that want to render a flat string with variable substrings
 * promoted to <VariableChip>. For HTML-bearing template bodies, callers
 * should sanitize/parse the HTML first; this helper is for plain text segments
 * (e.g., subjects, card 2-line previews stripped of tags).
 */
export function renderWithVariables(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  VAR_RE.lastIndex = 0;
  while ((m = VAR_RE.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push(<VariableChip key={`v-${m.index}`} name={m[1]} />);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

/** Strip HTML tags from a body string for use in 2-line card previews. */
export function htmlToPreviewText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, " ")
    .replace(/<br\s*\/?>(?!\s*<)/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Substitute variable names with sample values for the preview pane. */
export function applySampleValues(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(VAR_RE, (_match, name: string) => {
    return Object.prototype.hasOwnProperty.call(values, name)
      ? values[name]
      : `{{${name}}}`;
  });
}

export const __TEST__ = { VAR_RE };
