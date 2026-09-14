import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { ROLE_HOME_PATH, MIGRATED_ROLES, type UserRole } from "./roles";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";

export interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Protege UX/navegación únicamente -- NO es la autoridad de seguridad real. Un usuario podría en
 * teoría alterar el bundle del cliente y saltarse este componente por completo; eso no le daría
 * acceso a ningún dato, porque cada query real sigue pasando por RLS con su propio auth.uid()/rol
 * verificado en la base. Este componente solo decide qué se PINTA en pantalla.
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { status, role, profileMissing } = useAuth();
  const location = useLocation();

  // HOTFIX (hard reload en rutas anidadas): `status` pasa a "authenticated" en cuanto
  // onAuthStateChange confirma la sesión, pero `profile`/`role` se cargan un instante después
  // (round-trip aparte, ver AuthProvider). En ese hueco, `role` todavía es null sin que eso
  // signifique "sin rol" -- antes, ese hueco caía en la rama `!role` de más abajo y hacía
  // <Navigate to="/login"> SIN state.from, perdiendo la ruta anidada original (ej.
  // /teacher/clases): LoginPage recién sabía el rol un instante después y, sin `from`, caía al
  // home del rol (/teacher) en vez de la ruta pedida. La corrección es tratar este hueco como
  // "todavía cargando" (mismo spinner que `status === "loading"`), nunca como un redirect --
  // sin esto no hay forma de distinguir "cargando" de "sin sesión" solo mirando `role`.
  const stillResolvingProfile = status === "authenticated" && !profileMissing && !role;

  if (status === "loading" || stillResolvingProfile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Spinner size={28} label="Cargando sesión…" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileMissing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-5)" }}>
        <div style={{ maxWidth: 480 }}>
          <Alert tone="danger">
            Tu cuenta no tiene un perfil asociado. Contacta a un administrador para que lo cree -- esta aplicación nunca crea perfiles
            automáticamente.
          </Alert>
        </div>
      </div>
    );
  }

  // Acá `role` está garantizado no-null: unauthenticated y profileMissing ya se manejaron arriba,
  // y stillResolvingProfile descarta el único hueco donde status="authenticated" con role=null.
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Nunca a una página "prohibido": cada usuario termina en su propio home, mismo criterio que
    // requireRole() en el proyecto Next. Si ese home es un rol todavía no migrado a este SPA
    // (admin), <Navigate> a esa ruta no serviría de nada -- este router no la tiene -- así que
    // hace falta un salto duro al Next viejo en vez de routing interno.
    return MIGRATED_ROLES.includes(role) ? <Navigate to={ROLE_HOME_PATH[role]} replace /> : <HardRedirectToLegacy role={role} />;
  }

  return <>{children}</>;
}

function HardRedirectToLegacy({ role }: { role: UserRole }) {
  React.useEffect(() => {
    window.location.replace(`${import.meta.env.VITE_API_BASE_URL}${ROLE_HOME_PATH[role]}`);
  }, [role]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <Spinner size={28} label="Redirigiendo…" />
    </div>
  );
}
