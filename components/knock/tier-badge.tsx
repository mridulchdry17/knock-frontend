import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/lib/auth/types";

const TIER_DISPLAY: Record<Tier, { label: string; tone: "neutral" | "ember" | "moss" | "ochre" | "bordeaux" }> = {
  pending: { label: "Pending", tone: "ochre" },
  free: { label: "Free", tone: "neutral" },
  paid: { label: "Paid", tone: "ember" },
  super_admin: { label: "Admin", tone: "moss" },
  suspended: { label: "Suspended", tone: "bordeaux" },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const { label, tone } = TIER_DISPLAY[tier];
  return <Badge tone={tone}>{label}</Badge>;
}
