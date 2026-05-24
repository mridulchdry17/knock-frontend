import * as React from "react";
import {
  Check,
  Circle,
  CircleCheck,
  CircleSlash,
  CircleX,
  Clock,
  MailCheck,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayCardStatus } from "@/lib/today/types";

/**
 * Color-coded status indicator. Color independence per a11y spec — every
 * variant pairs an icon + text label, so deuteranopes still parse it.
 */
interface StatusPillProps {
  status: TodayCardStatus;
  className?: string;
}

const VARIANTS: Record<
  TodayCardStatus,
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  default: {
    label: "Default",
    classes: "bg-paper-2 text-ink-2 border-line-2",
    Icon: Circle,
  },
  ready: {
    label: "Ready",
    classes: "bg-ember-tint text-flint border-transparent",
    Icon: Check,
  },
  sent: {
    label: "Sent",
    classes: "bg-moss-tint text-moss border-transparent",
    Icon: CircleCheck,
  },
  cooldown: {
    label: "Cooldown",
    classes: "bg-ochre-tint text-ochre border-transparent",
    Icon: Clock,
  },
  skipped: {
    label: "Skipped",
    classes: "bg-paper-2 text-ink-3 border-line-2 line-through",
    Icon: CircleSlash,
  },
  held: {
    label: "Held",
    classes: "bg-bordeaux-tint text-bordeaux border-transparent",
    Icon: PauseCircle,
  },
  failed: {
    label: "Failed",
    classes: "bg-bordeaux-tint text-bordeaux border-transparent",
    Icon: CircleX,
  },
  replied: {
    label: "Replied",
    classes: "bg-moss-tint text-moss border-transparent",
    Icon: MailCheck,
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const v = VARIANTS[status];
  const Icon = v.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-caption font-medium",
        v.classes,
        className,
      )}
      aria-label={`Status: ${v.label}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{v.label}</span>
    </span>
  );
}

/** Token color for the avatar-strip bottom-right status dot. */
export function statusDotColorClass(status: TodayCardStatus): string {
  switch (status) {
    case "ready":
      return "bg-ember";
    case "sent":
      return "bg-moss";
    case "cooldown":
      return "bg-ochre";
    case "held":
    case "failed":
      return "bg-bordeaux";
    case "replied":
      return "bg-moss";
    case "skipped":
      return "bg-ink-3";
    case "default":
    default:
      return "bg-ink-3";
  }
}
