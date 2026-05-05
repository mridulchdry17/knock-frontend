"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { ComingSoon } from "@/components/knock/coming-soon";

/**
 * /profile is mobile-only. On desktop ≥1024px, redirect to /preferences (where
 * profile settings live in the desktop IA). We do this client-side so SSR
 * doesn't have to know the viewport.
 */
export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/preferences");
    }
  }, [router]);

  return (
    <AppShell title="Profile">
      <ComingSoon />
    </AppShell>
  );
}
