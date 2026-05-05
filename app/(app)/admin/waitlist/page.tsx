import { AppShell } from "@/components/shell/app-shell";
import { WaitlistView } from "@/components/admin/waitlist-view";

export default function AdminWaitlistPage() {
  return (
    <AppShell title="Waitlist">
      <WaitlistView />
    </AppShell>
  );
}
