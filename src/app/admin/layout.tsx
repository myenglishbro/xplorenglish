import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { ADMIN_NAV_ITEMS } from "@/lib/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  console.log("[perf][AdminLayout] -> requireRole");
  const profile = await requireRole("admin");

  return (
    <AppShell profile={profile} navItems={ADMIN_NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
