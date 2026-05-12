"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS } from "@/components/shell/nav-config";
import { useInboxUnreadCount } from "@/lib/inbox/use-unread-count";

export function BottomTabNav() {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const inboxUnread = useInboxUnreadCount();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 h-14 border-t border-line bg-paper z-40"
      aria-label="Primary navigation"
    >
      <ul className="grid grid-cols-4 h-full">
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-flint" : "text-ink-3",
                )}
              >
                <span className="relative inline-flex">
                  <Icon size={20} aria-hidden />
                  {tab.href === "/inbox" && inboxUnread > 0 ? (
                    <span
                      aria-label={`${inboxUnread} unread`}
                      data-testid="bottom-tab-inbox-dot"
                      className="absolute -right-1 -top-0.5 h-2 w-2 rounded-pill bg-ember"
                    />
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
