import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useMyClassroomsAsTeacher } from "@/features/classrooms/hooks";
import { useAvailability } from "@/features/availability/hooks";
import { useStudentBalanceAlerts } from "@/features/balanceAlerts/hooks";
import { DAY_OF_WEEK_LABELS } from "@/features/availability/types";
import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { BalanceAlertsSection } from "@/components/balanceAlerts/BalanceAlertsSection";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/**
 * Slice F: ya no muestra "Próxima clase"/"Clases de hoy" (dependían de sessions, eliminada en
 * Slice A) -- el historial de clases ahora vive dentro de cada salón (ver SalonDetailPage). Este
 * home se reduce a los dos widgets que siguen teniendo sentido tal cual: salones activos y
 * disponibilidad configurada.
 */
export function TeacherHomePage() {
  const { profile } = useAuth();
  const classroomsQuery = useMyClassroomsAsTeacher();
  const availabilityQuery = useAvailability();
  const balanceAlertsQuery = useStudentBalanceAlerts();

  const isLoading = classroomsQuery.isLoading || availabilityQuery.isLoading;
  const isError = classroomsQuery.isError || availabilityQuery.isError;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (isError || !classroomsQuery.data || !availabilityQuery.data) {
    return <EmptyState icon="warning" title="No pudimos cargar tu inicio">Recarga la página para intentarlo de nuevo.</EmptyState>;
  }

  const classrooms = classroomsQuery.data;
  const availability = availabilityQuery.data;
  const nextAvailabilityBlock = availability[0];

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
        Hola, {profile?.first_name}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
        <StatCard label="Salones activos" value={classrooms.length} icon="chalkboard" tone="accent" />
        <StatCard label="Bloques de disponibilidad" value={availability.length} icon="clock" tone="brand" />
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Link to="/teacher/salones">
          <Button variant="accent" icon="chalkboard">Mis salones</Button>
        </Link>
        <Link to="/teacher/disponibilidad">
          <Button variant="secondary" icon="calendar-check">Mi disponibilidad</Button>
        </Link>
        <Link to="/teacher/perfil">
          <Button variant="secondary" icon="user-circle">Mi perfil</Button>
        </Link>
      </div>

      <Card header={cardTitle("Mi disponibilidad")}>
        {availability.length === 0 || !nextAvailabilityBlock ? (
          <EmptyState icon="calendar-check" title="Todavía no registraste disponibilidad">
            Agrégala desde Mi disponibilidad.
          </EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: "var(--text-heading)" }}>
              {availability.length} bloque{availability.length === 1 ? "" : "s"} configurado{availability.length === 1 ? "" : "s"}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
              Próximo: {DAY_OF_WEEK_LABELS[nextAvailabilityBlock.dayOfWeek]} {nextAvailabilityBlock.startTime.slice(0, 5)}–
              {nextAvailabilityBlock.endTime.slice(0, 5)}
            </span>
          </div>
        )}
      </Card>

      <div>
        {cardTitle("Saldos de atención")}
        <div style={{ marginTop: "var(--space-3)" }}>
          {balanceAlertsQuery.isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
              <Spinner size={24} label="Cargando…" />
            </div>
          ) : balanceAlertsQuery.isError || !balanceAlertsQuery.data ? (
            <EmptyState icon="warning" title="No pudimos cargar los saldos">Recarga la página para intentarlo de nuevo.</EmptyState>
          ) : (
            <BalanceAlertsSection
              items={balanceAlertsQuery.data}
              emptyTitle="Ningún alumno con saldo bajo"
              emptyDescription="Los alumnos con saldo normal (más de 120 min) no aparecen aquí."
              renderAction={(item) =>
                item.classroomId ? (
                  <Link to={`/teacher/salones/${item.classroomId}`} style={{ font: "var(--weight-bold) 12.5px/1 var(--font-body)", color: "var(--text-body)" }}>
                    Ver salón →
                  </Link>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
