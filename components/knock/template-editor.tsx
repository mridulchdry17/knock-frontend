"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Variable as VariableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Variable,
  VARIABLE_NAMES,
  type VariableName,
} from "@/lib/templates/tiptap-variable";
import {
  applySampleValues,
  htmlToPreviewText,
} from "@/components/knock/variable-chip";
import { cn } from "@/lib/utils";

/**
 * Sample values used to render the preview pane. Locked per spec.
 */
const SAMPLE_VALUES: Record<VariableName, string> = {
  first_name: "Sarah",
  company: "Acme",
  role: "Recruiter",
};

const AUTOSAVE_MS = 1500;
const SAVED_FLASH_MS = 2000;

export interface TemplateEditorValue {
  name: string;
  subject: string;
  body: string;
}

interface TemplateEditorProps {
  initial: TemplateEditorValue;
  /** Show the name input. New-template flow only; existing templates edit name elsewhere TBD. */
  showNameInput?: boolean;
  /** Called when the user explicitly saves OR autosave fires. Throws to surface failures. */
  onSave: (value: TemplateEditorValue) => Promise<void>;
  onCancel: () => void;
  onTestSend?: () => Promise<void>;
  /** When true, hides the desktop two-pane layout and renders body-only (mobile). */
  compact?: boolean;
  /** Currently active mobile tab (only matters when compact). */
  activeMobileTab?: "edit" | "preview";
  className?: string;
}

/**
 * Tiptap-powered template editor with subject + body + preview pane.
 *
 * Lazy-loaded by callers via next/dynamic so Tiptap (~80KB gzipped) stays out
 * of the /templates list bundle. Configuration:
 *  - StarterKit (paragraph, bold, italic, code, lists, history)
 *  - Link (Cmd+K opens an inline URL prompt; auto-detect URLs)
 *  - Placeholder ("Write your email body…")
 *  - Variable (custom node — `{{first_name}}` chips, atom + selectable)
 *
 * Autosave debounce is 1500ms (longer than /today's 800ms — templates are
 * reusable assets, not single-shot emails; less aggressive). Save button
 * remains for explicit save.
 */
export function TemplateEditor({
  initial,
  showNameInput = false,
  onSave,
  onCancel,
  onTestSend,
  compact = false,
  activeMobileTab = "edit",
  className,
}: TemplateEditorProps) {
  const [name, setName] = React.useState(initial.name);
  const [subject, setSubject] = React.useState(initial.subject);
  const [body, setBody] = React.useState(initial.body);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [snag, setSnag] = React.useState<string | null>(null);
  const [focusedField, setFocusedField] = React.useState<"subject" | "body">(
    "body",
  );
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const subjectInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastSavedRef = React.useRef<TemplateEditorValue>(initial);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Write your email body…" }),
      Variable,
    ],
    content: initial.body,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
      setDirty(true);
      setFocusedField("body");
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[240px] max-h-[60vh] overflow-y-auto rounded-md border border-line-2 bg-paper px-3 py-2 text-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus prose-sm",
        "aria-label": "Email body",
      },
    },
  });

  // Sync external initial → state when a different template is loaded.
  React.useEffect(() => {
    setName(initial.name);
    setSubject(initial.subject);
    setBody(initial.body);
    lastSavedRef.current = initial;
    setDirty(false);
    if (editor && editor.getHTML() !== initial.body) {
      editor.commands.setContent(initial.body, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.name, initial.subject, initial.body]);

  const performSave = React.useCallback(
    async (force: boolean) => {
      const value = { name, subject, body };
      const prior = lastSavedRef.current;
      const same =
        prior.name === value.name &&
        prior.subject === value.subject &&
        prior.body === value.body;
      if (!force && same) return;
      setSaving(true);
      setSnag(null);
      try {
        await onSave(value);
        lastSavedRef.current = value;
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
      } catch {
        setSnag("We hit a snag saving. Your changes are still here — try again.");
      } finally {
        setSaving(false);
      }
    },
    [name, subject, body, onSave],
  );

  // Autosave debounce — only fires when dirty.
  React.useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void performSave(false);
    }, AUTOSAVE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, subject, body, dirty, performSave]);

  const handleInsertVariable = (variable: VariableName) => {
    if (focusedField === "subject" && subjectInputRef.current) {
      const el = subjectInputRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const insert = `{{${variable}}}`;
      const next = subject.slice(0, start) + insert + subject.slice(end);
      setSubject(next);
      setDirty(true);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + insert.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    if (editor) {
      editor.chain().focus().insertVariable(variable).run();
    }
  };

  const previewSubject = applySampleValues(subject, SAMPLE_VALUES);
  const previewBody = renderPreviewBody(body, SAMPLE_VALUES);

  const showEdit = !compact || activeMobileTab === "edit";
  const showPreview = !compact || activeMobileTab === "preview";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-4",
        className,
      )}
      data-testid="template-editor"
    >
      <div className={cn("flex min-h-0 flex-1 gap-6", compact ? "flex-col" : "flex-col lg:flex-row")}>
        {/* Edit pane */}
        {showEdit ? (
          <div className={cn("flex min-h-0 flex-1 flex-col gap-3", !compact && "lg:basis-3/5")}>
            {showNameInput ? (
              <label className="flex flex-col gap-1 text-small text-ink-2">
                Template name
                <Input
                  value={name}
                  placeholder="Template name (e.g., Cold recruiter)"
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                  aria-label="Template name"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-small text-ink-2">
              Subject
              <Input
                ref={subjectInputRef}
                value={subject}
                placeholder="Subject (e.g., Quick note from a [Program] student)"
                onChange={(e) => {
                  setSubject(e.target.value);
                  setDirty(true);
                }}
                onFocus={() => setFocusedField("subject")}
                aria-label="Email subject"
              />
            </label>
            <Toolbar editor={editor} onInsertVariable={handleInsertVariable} />
            <EditorContent editor={editor} />
          </div>
        ) : null}

        {/* Preview pane */}
        {showPreview ? (
          <div
            className={cn(
              "flex min-h-0 flex-col gap-3 rounded-md bg-paper-2 p-card",
              !compact && "lg:basis-2/5",
            )}
            aria-label="Preview"
          >
            <p className="text-caption uppercase text-ink-3">Preview · sample data</p>
            <p className="text-h3 text-ink">{previewSubject}</p>
            <div
              className="prose-sm rounded-[14px] bg-paper p-4 text-body text-ink"
              data-testid="template-preview-body"
              // Preview HTML is produced client-side from Tiptap output (already
              // sanitized by Tiptap to its allowed schema). dangerouslySetInnerHTML
              // is acceptable here — input is editor-generated, not user-typed raw HTML.
              dangerouslySetInnerHTML={{ __html: previewBody }}
            />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {onTestSend ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onTestSend()}
          >
            Send a test to myself
          </Button>
        ) : null}
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
        <Button
          size="sm"
          onClick={() => void performSave(true)}
          disabled={saving || !dirty}
        >
          Save template
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

interface ToolbarProps {
  editor: Editor | null;
  onInsertVariable: (name: VariableName) => void;
}

function Toolbar({ editor, onInsertVariable }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  if (!editor) {
    return (
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-line-2 bg-paper-2 p-1" />
    );
  }

  const tbutton = (active: boolean, onClick: () => void, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-2 hover:text-ink",
        active && "bg-ember-tint text-flint",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
      )}
    >
      <Icon size={16} aria-hidden />
    </button>
  );

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-line-2 bg-paper-2 p-1">
      {tbutton(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold (Cmd+B)", Bold)}
      {tbutton(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic (Cmd+I)", Italic)}

      <div className="relative">
        {tbutton(editor.isActive("link"), () => {
          const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
          setLinkUrl(prev);
          setLinkOpen((o) => !o);
        }, "Link (Cmd+K)", Link2)}
        {linkOpen ? (
          <div className="absolute left-0 top-9 z-10 flex items-center gap-2 rounded-md border border-line-2 bg-paper p-2 shadow-sm">
            <Input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="h-8 w-56"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  setLinkOpen(false);
                }
              }}
            />
            <Button size="sm" onClick={applyLink}>
              Apply
            </Button>
          </div>
        ) : null}
      </div>

      {tbutton(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list", List)}
      {tbutton(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list", ListOrdered)}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insert variable"
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-sm px-2 text-small text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <VariableIcon size={14} aria-hidden />
            Variable
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {VARIABLE_NAMES.map((v) => (
            <DropdownMenuItem
              key={v}
              onSelect={(e) => {
                e.preventDefault();
                onInsertVariable(v);
              }}
              className="font-mono text-small"
            >
              {`{{${v}}}`}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Render the Tiptap-emitted HTML with sample variable values substituted.
 *
 * Two passes:
 *  1. Replace `<span data-variable="X">…</span>` chips with their sample value.
 *  2. Replace any literal `{{X}}` substrings (e.g., from initial seed bodies
 *     not yet round-tripped through the editor) with the same sample.
 */
function renderPreviewBody(html: string, values: Record<string, string>): string {
  const replacedNodes = html.replace(
    /<span\b[^>]*data-variable=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
    (_m, name: string) => values[name] ?? `{{${name}}}`,
  );
  return applySampleValues(replacedNodes, values);
}

export const __TEST__ = { renderPreviewBody, htmlToPreviewText, AUTOSAVE_MS };
