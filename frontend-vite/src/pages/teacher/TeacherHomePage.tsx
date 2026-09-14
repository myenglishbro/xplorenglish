import { useAuth } from "@/auth/useAuth";

/** Placeholder mínimo para "/teacher" (destino de ROLE_HOME_PATH.teacher tras login) -- fuera de
 * alcance de Fase 1 más allá de existir para que el login no aterrice en una ruta vacía. */
export function TeacherHomePage() {
  const { profile } = useAuth();
  return (
    <h1
      style={{
        font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
        letterSpacing: "var(--text-h2-ls)",
        color: "var(--text-heading)",
        margin: 0,
      }}
    >
      Hola, {profile?.first_name}
    </h1>
  );
}
