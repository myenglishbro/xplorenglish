import { useTeachers } from "@/features/teachers/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { TeachersTable } from "@/components/admin/teachers/TeachersTable";

/**
 * Portado de src/app/admin/docentes/page.tsx. El listado muestra teacher_profiles.status
 * (¿está operativo?), no profiles.status -- ver TeacherListItem/listTeachers para el criterio
 * completo. profiles.status ("Estado de cuenta") queda solo en el detalle.
 */
export function DocentesListPage() {
  const { data: teachers, isLoading, isError } = useTeachers();

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

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : isError || !teachers ? (
        <EmptyState icon="warning" title="No pudimos cargar los docentes">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <Card pad={teachers.length === 0}>
          {teachers.length === 0 ? (
            <EmptyState icon="chalkboard-teacher" title="Todavía no hay docentes">
              Promueve a un estudiante activo a docente desde su perfil en Usuarios para que aparezca aquí.
            </EmptyState>
          ) : (
            <TeachersTable items={teachers} />
          )}
        </Card>
      )}
    </div>
  );
}
