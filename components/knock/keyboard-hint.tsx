import { cn } from "@/lib/utils";

interface KeyboardHintProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function KeyboardHint({ children, className, ...props }: KeyboardHintProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded-sm border border-line-2 bg-paper-2 px-1.5 text-[11px] font-medium text-ink-2",
        "min-w-[20px] h-5 font-mono",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
