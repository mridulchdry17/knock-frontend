import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, body, primary, secondary, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center justify-center text-center py-16 px-4",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-ink-3" aria-hidden>{icon}</div> : null}
      <h2 className="text-h2 text-ink">{title}</h2>
      {body ? <p className="mt-2 text-body text-ink-2">{body}</p> : null}
      {(primary || secondary) && (
        <div className="mt-6 flex items-center gap-3">
          {primary}
          {secondary}
        </div>
      )}
    </div>
  );
}
