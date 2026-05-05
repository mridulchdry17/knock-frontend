import { EmptyState } from "@/components/knock/empty-state";
import { Hammer } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  body?: string;
}

/**
 * Used by routes scaffolded in F.1 whose content lands in later phases.
 * Per locked spec — never ship UI for features that aren't wired; surface a
 * smart empty state with locked microcopy instead.
 */
export function ComingSoon({
  title = "We're putting the finishing touches on this.",
  body = "Check back soon.",
}: ComingSoonProps) {
  return <EmptyState icon={<Hammer size={32} strokeWidth={1.5} />} title={title} body={body} />;
}
