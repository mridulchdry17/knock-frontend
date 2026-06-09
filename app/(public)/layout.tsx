import { RouteGuard } from "@/components/auth/route-guard";

/**
 * Authed-but-no-shell layout. Used for onboarding/awaiting-approval/connect-gmail
 * — these screens are full-bleed and intentionally don't show the sidebar.
 */
export default function PublicAuthLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}
