import { Link } from "react-router-dom";
import { useMyClassroomsAsTeacher } from "@/features/classrooms/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";

export function TeacherSalonesPage() {
  const { data: classrooms, isLoading, isError } = useMyClassroomsAsTeacher();

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
        Mis salones
      </h1>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando salones…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar tus salones. Recarga la página.</Alert>
      ) : classrooms && classrooms.length === 0 ? (
        <Card>
          <EmptyState icon="chalkboard" title="Todavía no tienes salones asignados">
            Cuando el admin te asigne como titular o suplente de un salón, aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {classrooms?.map((c) => (
            <Link key={c.id} to={`/teacher/salones/${c.id}`} style={{ textDecoration: "none" }}>
              <Card accent={c.role === "PRIMARY" ? "brand" : "accent"} style={{ height: "100%", cursor: "pointer" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h3 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/1.3 var(--font-display)", color: "var(--text-heading)" }}>{c.name}</h3>
                    <Tag tone={c.role === "PRIMARY" ? "brand" : "accent"} size="sm">{c.role === "PRIMARY" ? "Titular" : "Suplente"}</Tag>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
                    {c.programName} · Nivel {c.level}
                  </div>
                  {c.description && <p style={{ margin: 0, color: "var(--text-body)" }}>{c.description}</p>}
                  {c.scheduleNotes && (
                    <div style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>Notas: {c.scheduleNotes}</div>
                  )}
                  <div style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>{c.studentCount} estudiante{c.studentCount === 1 ? "" : "s"}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
