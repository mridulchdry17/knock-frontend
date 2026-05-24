import { AppShell } from "@/components/shell/app-shell";
import { ContactPoolView } from "@/components/admin/contact-pool-view";

export default function AdminContactPoolPage() {
  return (
    <AppShell title="Contact pool">
      <ContactPoolView />
    </AppShell>
  );
}
