import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { STUDENT_NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/auth/useAuth";

export function StudentLayout() {
  const { profile } = useAuth();
  if (!profile) return null; // ProtectedRoute ya garantiza esto.

  return (
    <AppShell profile={profile} navItems={STUDENT_NAV_ITEMS}>
      <Outlet />
    </AppShell>
  );
}
