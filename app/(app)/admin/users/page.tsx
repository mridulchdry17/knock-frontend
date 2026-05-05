import { AppShell } from "@/components/shell/app-shell";
import { UsersView } from "@/components/admin/users-view";

export default function AdminUsersPage() {
  return (
    <AppShell title="Users">
      <UsersView />
    </AppShell>
  );
}
