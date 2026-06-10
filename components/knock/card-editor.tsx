"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { fetchTemplates } from "@/lib/templates/client";
import type { Template } from "@/lib/templates/types";
import type { TodayItem } from "@/lib/today/types";
import { cn } from "@/lib/utils";

interface CardEditorProps {
  item: TodayItem;
  /**
   * Called when the user wants to commit the changes (Save / Cmd+S / blur-out).
   * Throws on failure; component shows the locked snag toast at call site.
   */
  onSave: (patch: { subject: string; body: string }) => Promise<void>;
  /**
   * Optional: called when the user picks a different template from the
   * dropdown. The parent re-fetches/refreshes the card so the new
   * server-rendered subject/body lands in the editor.
   */
  onSelectTemplate?: (templateId: string) => Promise<void>;
  /** Cancel: revert to read-only without persisting. */
  onCancel: () => void;
  className?: string;
}

const AUTOSAVE_MS = 800;
const SAVED_FLASH_MS = 2000;

/**
 * Plain-textarea inline editor (NOT Tiptap — Tiptap arrives in F.6 for /templates).
 * Subject input + body textarea + Preview toggle + Save/Cancel.
 *
 * Behavior:
 *  - Cmd+S / Ctrl+S → save now (calls onSave)
 *  - Escape → cancel (without persisting)
 *  - Outside click is handled by parent (it controls open/closed state)
 *  - Autosave on blur: 800ms debounce after last keystroke fires onSave silently
 *  - "Saved" flashes for 2s after successful save
 *  - Locked snag voice if save throws
 *
 * The parent useToday.editCard auto-marks the card ready (per spec).
 */
export function CardEditor({
  item,
  onSave,
  onSelectTemplate,
  onCancel,
  className,
}: CardEditorProps) {
  const [subject, setSubject] = React.useState(item.subject);
  const [body, setBody] = React.useState(item.body);
  const [preview, setPreview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [snag, setSnag] = React.useState<string | null>(null);
  const [templates, setTemplates] = React.useState<Template[] | null>(null);
  const [swapping, setSwapping] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = React.useRef<{ subject: string; body: string }>({
    subject: item.subject,
    body: item.body,
  });

  // Resync local state when the server-rendered card changes (e.g. after a
  // template swap). Compare via the ref so user keystrokes don't get clobbered.
  React.useEffect(() => {
    if (
      item.subject !== lastSavedRef.current.subject ||
      item.body !== lastSavedRef.current.body
    ) {
      setSubject(item.subject);
      setBody(item.body);
      lastSavedRef.current = { subject: item.subject, body: item.body };
    }
  }, [item.subject, item.body]);

  // Fetch the user's templates once for the picker. Cap is 3 per user, so this
  // is a small payload; no caching layer needed for v1.
  React.useEffect(() => {
    if (!onSelectTemplate) return;
    let cancelled = false;
    fetchTemplates()
      .then((r) => {
        if (cancelled) return;
        setTemplates(r.kind === "list" ? r.data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setTemplates([]); // picker just hides itself
      });
    return () => {
      cancelled = true;
    };
  }, [onSelectTemplate]);

  const handleSelectTemplate = async (newId: string) => {
    if (!onSelectTemplate || newId === (item.template_id ?? "")) return;
    setSwapping(true);
    setSnag(null);
    try {
      await onSelectTemplate(newId);
    } catch {
      setSnag("Couldn't swap templates. Try again.");
    } finally {
      setSwapping(false);
    }
  };

  const performSave = React.useCallback(
    async (force = false) => {
      const same =
        lastSavedRef.current.subject === subject && lastSavedRef.current.body === body;
      if (!force && same) return;
      setSaving(true);
      setSnag(null);
      try {
        await onSave({ subject, body });
        lastSavedRef.current = { subject, body };
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
      } catch {
        setSnag("We hit a snag saving. Your changes are still here — try again.");
      } finally {
        setSaving(false);
      }
    },
    [subject, body, onSave],
  );

  // Cmd+S / Ctrl+S to save; Escape to cancel.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void performSave(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  // Debounced autosave on keystrokes.
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void performSave(false);
    }, AUTOSAVE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subject, body, performSave]);

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      onKeyDown={onKeyDown}
      data-testid="card-editor"
    >
      {!preview ? (
        <>
          {templates && templates.length > 0 ? (
            <label className="flex flex-col gap-1 text-small text-ink-2">
              Template
              <select
                value={item.template_id ?? ""}
                onChange={(e) => void handleSelectTemplate(e.target.value)}
                disabled={swapping || !onSelectTemplate}
                aria-label="Template"
                className="rounded-sm border border-line-2 bg-paper px-3 py-2 text-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
              >
                {item.template_id == null ? (
                  <option value="">Default message</option>
                ) : null}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-caption text-ink-3">
                {swapping
                  ? "Swapping template…"
                  : "Switching templates rewrites this card's subject and body."}
              </span>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-small text-ink-2">
            Subject
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => void performSave(false)}
              className="rounded-sm border border-line-2 bg-paper px-3 py-2 text-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              aria-label="Email subject"
            />
          </label>
          <label className="flex flex-col gap-1 text-small text-ink-2">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => void performSave(false)}
              rows={10}
              className="rounded-sm border border-line-2 bg-paper px-3 py-2 text-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              aria-label="Email body"
            />
          </label>
        </>
      ) : (
        <div className="rounded-md bg-paper-2 p-card text-body text-ink-2">
          <p className="mb-3 text-h3 text-ink">{subject}</p>
          <p className="whitespace-pre-line">{body}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
        >
          {preview ? "Edit" : "Preview"}
        </Button>
        <span
          className="ml-auto text-caption text-ink-3"
          aria-live="polite"
          data-testid="autosave-status"
        >
          {saving ? "Saving…" : savedFlash ? "Saved" : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void performSave(true)} disabled={saving}>
          Save
        </Button>
      </div>
      {snag ? (
        <p role="alert" className="text-small text-bordeaux">
          {snag}
        </p>
      ) : null}
    </div>
  );
}

export const __TESTING__ = { AUTOSAVE_MS };
