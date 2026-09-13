import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { STUDENT_NAV_ITEMS } from "@/lib/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  console.log("[perf][StudentLayout] -> requireRole");
  const profile = await requireRole("student");

  return (
    <AppShell profile={profile} navItems={STUDENT_NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
