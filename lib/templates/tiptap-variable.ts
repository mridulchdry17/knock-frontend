import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Custom inline Tiptap node for `{{variable}}` chips.
 *
 * Selectable + deletable as a single unit (atom), non-editable internals,
 * renders to an inline span with --ember-tint bg / --flint text + JetBrains
 * Mono. Shape mirrors <VariableChip> so the editor and preview pane look
 * pixel-identical.
 *
 * On serialization (`getHTML()`), the node emits a span with
 * `data-variable="<name>"`; backend's HTML→plaintext renderer at send time
 * substitutes values. On parse, the node reads the same `data-variable`.
 */
export const VARIABLE_NAMES = ["first_name", "company", "role"] as const;
export type VariableName = (typeof VARIABLE_NAMES)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variable: {
      insertVariable: (name: VariableName) => ReturnType;
    };
  }
}

export const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: "first_name",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-variable"),
        renderHTML: (attrs) => ({ "data-variable": attrs.name as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const merged = mergeAttributes(HTMLAttributes, {
      class:
        "inline-flex items-center rounded-sm bg-ember-tint px-1 py-[2px] font-mono text-[12px] text-flint",
      contenteditable: "false",
    });
    const name = (HTMLAttributes as { "data-variable"?: string })["data-variable"] ?? "first_name";
    return ["span", merged, `{{${name}}}`];
  },

  addCommands() {
    return {
      insertVariable:
        (name: VariableName) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { name },
          });
        },
    };
  },
});
