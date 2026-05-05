import { Inbox, FileText, Sun, Settings, User, Users, Database, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: FileText },
];

/** Desktop-only — on mobile, Profile is its own bottom tab and Preferences lives there too. */
export const SECONDARY_NAV_DESKTOP: NavItem[] = [
  { href: "/preferences", label: "Preferences", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/contact-pool", label: "Contact pool", icon: Database },
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];
