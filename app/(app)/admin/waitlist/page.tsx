import { AppShell } from "@/components/shell/app-shell";
import { ComingSoon } from "@/components/knock/coming-soon";

export default function AdminWaitlistPage() {
  return (
    <AppShell title="Waitlist">
      <ComingSoon />
    </AppShell>
  );
}
