import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/navigation";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  console.log("[perf][TeacherLayout] -> requireRole");
  const profile = await requireRole("teacher");

  return (
    <AppShell profile={profile} navItems={TEACHER_NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
