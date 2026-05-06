"use client";

import * as React from "react";
import {
  useEditor,
  EditorContent,
  type Editor,
  type EditorOptions,
  type Extensions,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Pure Tiptap wrapper used by both /templates (full toolbar + variables)
 * and /inbox reply composer (minimal toolbar). Caller passes the extension
 * set + a renderProp toolbar so the primitive stays unopinionated.
 *
 * Lazy-loading is the caller's responsibility (e.g. next/dynamic) so the
 * Tiptap bundle (~80KB gz) is kept off cold list paints.
 */

export interface RichTextEditorHandle {
  editor: Editor | null;
  /** Replace content imperatively (e.g. when switching to a different template). */
  setContent: (html: string) => void;
  /** True when the editor's text content is empty. */
  isEmpty: () => boolean;
  focus: () => void;
}

export interface RichTextEditorProps {
  /** Initial HTML. Subsequent changes via this prop are NOT auto-synced — use the handle. */
  value: string;
  /** Fired on every doc update with the latest HTML. */
  onChange?: (html: string) => void;
  /** Tiptap extensions. Required — caller decides full vs. minimal. */
  extensions: Extensions;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** Render-prop for a toolbar bound to this editor. */
  toolbar?: (editor: Editor | null) => React.ReactNode;
  /** Min height (Tailwind class fragment, e.g. `min-h-[120px]`). */
  minHeight?: string;
  /** Max height (Tailwind class fragment, e.g. `max-h-[60vh]`). */
  maxHeight?: string;
  /** A11y label for the contentEditable surface. */
  ariaLabel?: string;
  /** Override editorProps.attributes.class entirely. Default = sane prose styles. */
  contentClassName?: string;
  className?: string;
  /** Forwarded to useEditor for advanced callers. */
  editorOptions?: Partial<Omit<EditorOptions, "extensions" | "content" | "onUpdate">>;
}

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      value,
      onChange,
      extensions,
      placeholder,
      toolbar,
      minHeight = "min-h-[180px]",
      maxHeight = "max-h-[60vh]",
      ariaLabel = "Rich text editor",
      contentClassName,
      className,
      editorOptions,
    },
    ref,
  ) {
    const allExtensions = React.useMemo<Extensions>(() => {
      if (!placeholder) return extensions;
      return [...extensions, Placeholder.configure({ placeholder })];
    }, [extensions, placeholder]);

    const editor = useEditor({
      ...editorOptions,
      extensions: allExtensions,
      content: value,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            contentClassName ??
            cn(
              "overflow-y-auto rounded-md border border-line-2 bg-paper px-3 py-2 text-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus prose-sm",
              minHeight,
              maxHeight,
            ),
          "aria-label": ariaLabel,
        },
      },
    });

    React.useImperativeHandle(
      ref,
      () => ({
        editor,
        setContent: (html: string) => {
          if (!editor) return;
          if (editor.getHTML() === html) return;
          editor.commands.setContent(html, { emitUpdate: false });
        },
        isEmpty: () => {
          if (!editor) return true;
          return editor.isEmpty;
        },
        focus: () => editor?.commands.focus(),
      }),
      [editor],
    );

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {toolbar ? toolbar(editor) : null}
        <EditorContent editor={editor} />
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Shared minimal extension sets                                              */
/* -------------------------------------------------------------------------- */

/**
 * StarterKit + Link only. Used by /inbox reply composer — no headings,
 * no images, no variables (replies aren't templated).
 */
export function minimalReplyExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: false,
    }),
    Link.configure({ openOnClick: false, autolink: true }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Toolbar primitive used by both editors                                      */
/* -------------------------------------------------------------------------- */

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}

export function ToolbarButton({ active, onClick, label, icon: Icon }: ToolbarButtonProps) {
  return (
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
}

interface InlineLinkPopoverProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InlineLinkPopover({ editor, open, onOpenChange }: InlineLinkPopoverProps) {
  const [linkUrl, setLinkUrl] = React.useState("");
  React.useEffect(() => {
    if (open) {
      const prev = (editor.getAttributes("link").href as string | undefined) ?? "";
      setLinkUrl(prev);
    }
  }, [open, editor]);

  const apply = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onOpenChange(false);
  };

  if (!open) return null;
  return (
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
            apply();
          } else if (e.key === "Escape") {
            onOpenChange(false);
          }
        }}
      />
      <Button size="sm" onClick={apply}>
        Apply
      </Button>
    </div>
  );
}

interface MinimalToolbarButtonsProps {
  editor: Editor;
  /** Show bullet list button. Default true. */
  showBullet?: boolean;
}

/**
 * Minimal toolbar buttons (no outer chrome) — Bold / Italic / Link /
 * (optional) Bullet. Compose inside a wrapper row, optionally with
 * additional buttons (e.g. Numbered, Variable) tacked on the end.
 */
export function MinimalToolbarButtons({ editor, showBullet = true }: MinimalToolbarButtonsProps) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  return (
    <>
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold (Cmd+B)"
        icon={Bold}
      />
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic (Cmd+I)"
        icon={Italic}
      />
      <div className="relative">
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => setLinkOpen((o) => !o)}
          label="Link (Cmd+K)"
          icon={Link2}
        />
        <InlineLinkPopover editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
      </div>
      {showBullet ? (
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
          icon={List}
        />
      ) : null}
    </>
  );
}

interface MinimalToolbarProps {
  editor: Editor | null;
  /** Show bullet list button. Default true. */
  showBullet?: boolean;
}

/**
 * Minimal toolbar with chrome — Bold / Italic / Link / (optional) Bullet.
 * Used standalone by /inbox reply composer.
 */
export function MinimalToolbar({ editor, showBullet = true }: MinimalToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-line-2 bg-paper-2 p-1">
      {editor ? <MinimalToolbarButtons editor={editor} showBullet={showBullet} /> : null}
    </div>
  );
}

/** Re-exported icon set for callers building richer toolbars (templates). */
export const ToolbarIcons = { Bold, Italic, Link2, List, ListOrdered };
