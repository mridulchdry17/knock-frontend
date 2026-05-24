import { cn } from "@/lib/utils";

/**
 * Marketing twin of the in-app VariableChip (components/knock/variable-chip.tsx)
 * — identical class string so the homepage reads as the real product, not a
 * generic template. Render-only, no state. Only the three variables the product
 * actually ships are valid here: first_name, company, role. (There is no
 * sender_name variable in-app — don't introduce one.)
 */
export function LandingVariableChip({
  name,
  className,
}: {
  name: "first_name" | "company" | "role";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-ember-tint px-1 py-[2px] font-mono text-[12px] text-flint",
        className,
      )}
    >
      {`{{${name}}}`}
    </span>
  );
}
