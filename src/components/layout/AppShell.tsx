"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarNav, type SidebarNavItem } from "@/components/ui/navigation/SidebarNav";
import { TopBar } from "@/components/ui/navigation/TopBar";
import { Button } from "@/components/ui/core/Button";
import { logoutAction } from "@/lib/auth/actions";
import type { UserRole } from "@/lib/auth/roles";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Docente",
  student: "Estudiante",
};

export interface AppShellProfile {
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface AppShellProps {
  profile: AppShellProfile;
  navItems: SidebarNavItem[];
  children: React.ReactNode;
}

export function AppShell({ profile, navItems, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const activeValue = navItems.find((item) => pathname === item.value)?.value;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAction();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      <SidebarNav
        items={navItems}
        value={activeValue}
        onChange={(value) => router.push(value)}
        footer={
          <Button variant="ghost" icon="sign-out" fullWidth loading={loggingOut} disabled={loggingOut} onClick={handleLogout}>
            Cerrar sesión
          </Button>
        }
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar title={fullName} subtitle={ROLE_LABEL[profile.role]} user={{ name: fullName, role: ROLE_LABEL[profile.role] }} />
        <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
