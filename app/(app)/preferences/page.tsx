import { AppShell } from "@/components/shell/app-shell";
import { PreferencesView } from "@/components/preferences/preferences-view";

export default function PreferencesPage() {
  return (
    <AppShell title="Preferences">
      <PreferencesView />
    </AppShell>
  );
}
