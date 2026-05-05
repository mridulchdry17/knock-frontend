import { RouteGuard } from "@/components/auth/route-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}
