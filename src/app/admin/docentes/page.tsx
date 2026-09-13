import { createClient } from "@/lib/supabase/server";
import { listTeachers } from "@/server/admin/teachers/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { TeachersTable } from "@/components/admin/teachers/TeachersTable";

/**
 * El listado muestra un solo "Estado": teacher_profiles.status, no profiles.status. Son dos
 * conceptos distintos (ver server/admin/teachers/types.ts) -- se eligió teacher_profiles.status
 * porque es el que de verdad determina si el docente está operativo (start_session y las
 * asignaciones de salón lo exigen 'active'); profiles.status es más genérico (acceso/login) y
 * ya vive en /admin/usuarios. profiles.status sigue disponible, con su propio rótulo, en el
 * detalle (/admin/docentes/[id]).
 */
export default async function AdminDocentesPage() {
  const supabase = createClient();
  const teachers = await listTeachers(supabase);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Docentes
      </h1>

      <Card pad={teachers.length === 0}>
        {teachers.length === 0 ? (
          <EmptyState icon="chalkboard-teacher" title="Todavía no hay docentes">
            Promueve a un estudiante activo a docente desde su perfil en Usuarios para que aparezca aquí.
          </EmptyState>
        ) : (
          <TeachersTable items={teachers} />
        )}
      </Card>
    </div>
  );
}
