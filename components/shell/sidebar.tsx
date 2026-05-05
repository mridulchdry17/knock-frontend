"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/knock/wordmark";
import { useAuth } from "@/components/auth/auth-context";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { ADMIN_NAV, PRIMARY_NAV, SECONDARY_NAV_DESKTOP, type NavItem } from "@/components/shell/nav-config";
import { Separator } from "@/components/ui/separator";
import { GmailDisconnectedDot } from "@/components/gmail/gmail-disconnected-dot";

function NavLink({
  item,
  active,
  trailing,
}: {
  item: NavItem;
  active: boolean;
  trailing?: React.ReactNode;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-4 py-3 text-[15px] font-medium",
        "text-ink-2 hover:bg-paper",
        active && "bg-ember-tint text-flint hover:bg-ember-tint",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-flint"
        />
      )}
      <Icon size={16} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {trailing}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { user, gmailDisconnected } = useAuth();
  const isAdmin = user?.tier === "super_admin";

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const trailingFor = (href: string) =>
    href === "/today" && gmailDisconnected ? <GmailDisconnectedDot /> : undefined;

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] flex-col border-r border-line bg-paper-2"
      aria-label="Primary navigation"
    >
      <div className="px-card pt-card pb-4">
        <Link href="/today" aria-label="Knock home" className="inline-block">
          <Wordmark size={20} />
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            trailing={trailingFor(item.href)}
          />
        ))}
        <Separator className="my-3" />
        {SECONDARY_NAV_DESKTOP.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {isAdmin && (
          <>
            <Separator className="my-3" />
            <div className="px-4 py-1 text-caption uppercase text-ink-3">Admin</div>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <ProfileMenu />
      </div>
    </aside>
  );
}
