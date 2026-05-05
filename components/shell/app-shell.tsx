"use client";

import { Sidebar } from "@/components/shell/sidebar";
import { BottomTabNav } from "@/components/shell/bottom-tab-nav";
import { TopBar } from "@/components/shell/topbar";

interface AppShellProps {
  title?: string;
  action?: React.ReactNode;
  /** Render content below the topbar (e.g. disconnect-Gmail banner — fed by F.4). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, action, banner, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="lg:pl-[240px]">
        <TopBar title={title} action={action} />
        {/* Disconnected-Gmail banner mount point — F.1 just provides the slot. */}
        {banner ? <div className="border-b border-line">{banner}</div> : null}
        <main id="main" className="pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <BottomTabNav />
    </div>
  );
}
