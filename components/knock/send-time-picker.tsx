"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

interface SendTimePickerProps {
  /** Current send_time ISO string. */
  value: string;
  /** Called with the new ISO when user clicks Apply. */
  onApply: (iso: string) => void;
  onCancel: () => void;
  /** Mobile-only flag flips inline layout to bottom-sheet style. */
  mobile?: boolean;
}

const MAX_DAYS_AHEAD = 7;
const SLOT_MINUTES = 30;

function buildTimeSlots(forDate: Date): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  const isToday =
    forDate.getFullYear() === now.getFullYear() &&
    forDate.getMonth() === now.getMonth() &&
    forDate.getDate() === now.getDate();
  // 30-min increments from now (rounded up) to 11:30pm
  const start = new Date(forDate);
  if (isToday) {
    start.setHours(now.getHours(), now.getMinutes(), 0, 0);
    // Round up to next 30-min boundary.
    const m = start.getMinutes();
    const add = m === 0 ? 0 : SLOT_MINUTES - (m % SLOT_MINUTES);
    start.setMinutes(start.getMinutes() + add);
  } else {
    start.setHours(7, 0, 0, 0);
  }
  const end = new Date(forDate);
  end.setHours(23, 30, 0, 0);

  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    out.push({
      value: cursor.toISOString(),
      label: cursor.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    });
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }
  return out;
}

/**
 * Calendar (capped at +7 days) + 30-min time slot dropdown. Inline (popover-
 * style); the parent decides anchoring (Popover on desktop, Sheet on mobile).
 *
 * Locked microcopy: title "Send when?" / Apply / Cancel.
 */
export function SendTimePicker({ value, onApply, onCancel, mobile }: SendTimePickerProps) {
  const initial = React.useMemo(() => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [selectedDate, setSelectedDate] = React.useState<Date>(initial);
  const [selectedTime, setSelectedTime] = React.useState<string>(value);

  // When date changes, snap time to first slot of that day if current time isn't valid.
  const slots = React.useMemo(() => buildTimeSlots(selectedDate), [selectedDate]);
  React.useEffect(() => {
    if (!slots.find((s) => s.value === selectedTime)) {
      if (slots.length > 0) setSelectedTime(slots[0].value);
    }
  }, [slots, selectedTime]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + MAX_DAYS_AHEAD);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-line bg-paper p-4 shadow-md",
        mobile ? "w-full" : "w-[320px]",
      )}
      role="dialog"
      aria-label="Send when?"
    >
      <p className="text-small font-medium text-ink">Send when?</p>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(d) => d && setSelectedDate(d)}
        disabled={[{ before: today }, { after: max }]}
        className="text-small"
      />
      <label className="flex flex-col gap-1 text-small text-ink-2">
        Time
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="rounded-sm border border-line-2 bg-paper px-2 py-1 text-small text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {slots.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => onApply(selectedTime)}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export const __TESTING__ = { MAX_DAYS_AHEAD, buildTimeSlots };
