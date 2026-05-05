"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { BottomTabNav } from "@/components/shell/bottom-tab-nav";
import { TopBar } from "@/components/shell/topbar";
import { GmailReauthBanner } from "@/components/gmail/gmail-reauth-banner";
import { useAuth } from "@/components/auth/auth-context";

interface AppShellProps {
  title?: string;
  action?: React.ReactNode;
  /** Render content below the topbar (e.g. /today's disconnected banner — F.5). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, action, banner, children }: AppShellProps) {
  const { gmailReauthRequired } = useAuth();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="lg:pl-[240px]">
        <TopBar title={title} action={action} />
        {/* Global re-auth banner — appears on every authed route when Gmail token is revoked. */}
        {gmailReauthRequired ? <GmailReauthBanner /> : null}
        {/* Page-scoped banner slot — F.5 mounts the disconnected banner on /today here. */}
        {banner ? <div className="border-b border-line">{banner}</div> : null}
        <main id="main" className="pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <BottomTabNav />
    </div>
  );
}
