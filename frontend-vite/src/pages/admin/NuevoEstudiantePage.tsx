import { Link } from "react-router-dom";
import { usePrograms } from "@/features/users/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { CreateStudentForm } from "@/components/admin/students/CreateStudentForm";

export function NuevoEstudiantePage() {
  const programsQuery = usePrograms({ activeOnly: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/estudiantes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Estudiantes
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          Nuevo estudiante
        </h1>
      </div>

      <Card>
        {programsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
            <Spinner size={24} label="Cargando…" />
          </div>
        ) : (
          <CreateStudentForm programs={programsQuery.data ?? []} />
        )}
      </Card>
    </div>
  );
}
