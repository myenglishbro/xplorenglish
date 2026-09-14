import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarNav, type SidebarNavItem } from "@/components/ui/navigation/SidebarNav";
import { TopBar } from "@/components/ui/navigation/TopBar";
import { Button } from "@/components/ui/core/Button";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/auth/roles";

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

/**
 * Portado literal de src/components/layout/AppShell.tsx (Next) -- único cambio real es la fuente
 * de routing (react-router en vez de next/navigation) y logout (supabase.auth.signOut() directo
 * en vez de la Server Action logoutAction). El resto del JSX/estilos es idéntico a propósito,
 * para conservar la identidad visual exacta.
 */
export function AppShell({ profile, navItems, children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const activeValue = navItems.find((item) => location.pathname === item.value)?.value;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      <SidebarNav
        items={navItems}
        value={activeValue}
        onChange={(value) => navigate(value)}
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
