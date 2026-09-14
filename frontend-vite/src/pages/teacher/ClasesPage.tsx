import { useSessions } from "@/features/scheduling/hooks";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { TeacherSessionsTable } from "@/components/teacher/scheduling/TeacherSessionsTable";

export function TeacherClasesPage() {
  const { data, isLoading, isError } = useSessions();

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
        Mis clases
      </h1>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando clases…" />
        </div>
      ) : isError || !data ? (
        <Alert tone="danger">No pudimos cargar tus clases. Recarga la página.</Alert>
      ) : (
        <>
          <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Próximas clases</span>} pad={data.upcoming.length === 0}>
            {data.upcoming.length === 0 ? (
              <EmptyState icon="video-camera" title="Sin clases próximas">
                Cuando tengas una sesión programada, aparecerá aquí.
              </EmptyState>
            ) : (
              <TeacherSessionsTable sessions={data.upcoming} showActions />
            )}
          </Card>

          <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Clases pasadas</span>} pad={data.past.length === 0}>
            {data.past.length === 0 ? (
              <EmptyState icon="clock-counter-clockwise" title="Sin clases pasadas todavía" />
            ) : (
              <TeacherSessionsTable sessions={data.past} showActions={false} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
