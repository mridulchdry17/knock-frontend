"use client";

import { AppShell } from "@/components/shell/app-shell";
import { InboxView } from "@/components/knock/inbox-view";

export default function InboxPage() {
  return (
    <AppShell title="Inbox">
      <InboxView />
    </AppShell>
  );
}
