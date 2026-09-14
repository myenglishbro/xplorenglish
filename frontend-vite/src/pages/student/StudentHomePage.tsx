import { Link } from "react-router-dom";
import { useHoursPackages } from "@/features/hours/hooks";
import { useSessions } from "@/features/scheduling/hooks";
import { summarizeHoursPackages } from "@/server/hours/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";
import { StudentSessionsTable } from "@/components/student/scheduling/StudentSessionsTable";

export function StudentHomePage() {
  const packagesQuery = useHoursPackages();
  const sessionsQuery = useSessions();

  const isLoading = packagesQuery.isLoading || sessionsQuery.isLoading;
  const isError = packagesQuery.isError || sessionsQuery.isError;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (isError || !packagesQuery.data || !sessionsQuery.data) {
    return <Alert tone="danger">No pudimos cargar tu inicio. Recarga la página.</Alert>;
  }

  const summary = summarizeHoursPackages(packagesQuery.data);
  const { upcoming, past } = sessionsQuery.data;
  const nextSession = upcoming[0];
  const recentSessions = past.slice(0, 5);

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
        Inicio
      </h1>

      <HoursSummaryCard summary={summary} />

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Link to="/student/salones">
          <Button variant="accent" icon="chalkboard">Mis salones</Button>
        </Link>
        <Link to="/student/horas">
          <Button variant="secondary" icon="clock">Mis horas</Button>
        </Link>
      </div>

      <Card
        header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Próxima clase</span>}
        pad={!nextSession}
      >
        {!nextSession ? (
          <EmptyState icon="video-camera" title="Sin clases próximas">
            Cuando tu docente programe una clase, aparecerá aquí.
          </EmptyState>
        ) : (
          <StudentSessionsTable sessions={[nextSession]} />
        )}
      </Card>

      <Card
        header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Últimas clases</span>}
        pad={recentSessions.length === 0}
      >
        {recentSessions.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Sin clases pasadas todavía" />
        ) : (
          <StudentSessionsTable sessions={recentSessions} />
        )}
      </Card>
    </div>
  );
}
