import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { TEACHER_NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/auth/useAuth";

/**
 * Reemplaza src/app/teacher/layout.tsx (Next). La diferencia clave: ese layout llamaba
 * requireRole("teacher") -- 2 round-trips (auth.getUser + profiles) EN CADA NAVEGACIÓN. Acá el
 * profile ya está en memoria (AuthProvider, cargado una sola vez) -- este componente solo lo lee,
 * no vuelve a pedir nada. `role`/`profileMissing` ya fueron validados por <ProtectedRoute> antes
 * de llegar aquí, así que `profile` está garantizado no-null en este punto.
 */
export function TeacherLayout() {
  const { profile } = useAuth();
  if (!profile) return null; // ProtectedRoute ya garantiza esto; guard defensivo para TS.

  return (
    <AppShell profile={profile} navItems={TEACHER_NAV_ITEMS}>
      <Outlet />
    </AppShell>
  );
}
