import { AppShell } from "@/components/shell/app-shell";
import { ComingSoon } from "@/components/knock/coming-soon";

export default function TodayPage() {
  return (
    <AppShell title="Today">
      <ComingSoon
        title="Your first batch is being matched."
        body="You'll see it within a week of approval."
      />
    </AppShell>
  );
}
