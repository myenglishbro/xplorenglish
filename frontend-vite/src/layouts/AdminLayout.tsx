import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { ADMIN_NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/auth/useAuth";

export function AdminLayout() {
  const { profile } = useAuth();
  if (!profile) return null; // ProtectedRoute ya garantiza esto.

  return (
    <AppShell profile={profile} navItems={ADMIN_NAV_ITEMS}>
      <Outlet />
    </AppShell>
  );
}
