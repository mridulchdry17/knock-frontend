"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ChipMultiSelectProps {
  values: string[];
  suggestions: string[];
  /** Placeholder for the freetext input. */
  placeholder?: string;
  /** Fires whenever the selected list changes — page wires to autosave. */
  onChange: (next: string[]) => void;
  /** Fires when the input blurs — used to flush autosave debounce. */
  onBlur?: () => void;
}

/**
 * Multi-select chip input. Suggestions render as toggleable chips above a
 * freetext input that accepts Enter to add a custom value. Backspace on an
 * empty input pops the last chip — same affordance as Linear's label picker.
 */
export function ChipMultiSelect({
  values,
  suggestions,
  placeholder,
  onChange,
  onBlur,
}: ChipMultiSelectProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function commit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-3">
      {/* Suggestion chips — tap to toggle. */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const active = values.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => (active ? remove(s) : commit(s))}
              className={cn(
                "rounded-pill border px-3 py-1 text-small transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
                active
                  ? "border-flint bg-flint text-paper"
                  : "border-line-2 bg-paper text-ink hover:bg-paper-2",
              )}
              aria-pressed={active}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Custom chips that aren't in the suggestion list. */}
      {values.filter((v) => !suggestions.includes(v)).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values
            .filter((v) => !suggestions.includes(v))
            .map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1.5 rounded-pill bg-flint px-3 py-1 text-small text-paper"
              >
                {v}
                <button
                  type="button"
                  onClick={() => remove(v)}
                  aria-label={`Remove ${v}`}
                  className="text-paper/80 hover:text-paper"
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            ))}
        </div>
      ) : null}

      {/* Freetext entry. */}
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) commit(draft);
          onBlur?.();
        }}
        placeholder={placeholder ?? "Add custom — press Enter"}
        aria-label={placeholder ?? "Add custom industry"}
      />
    </div>
  );
}
