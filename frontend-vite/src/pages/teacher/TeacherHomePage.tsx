import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useSessions } from "@/features/scheduling/hooks";
import { useMyClassroomsAsTeacher } from "@/features/classrooms/hooks";
import { useAvailability } from "@/features/availability/hooks";
import { getTodayRangeInLima, formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";
import type { SessionListItem } from "@/server/scheduling/types";
import { Card } from "@/components/ui/surfaces/Card";
import { StatCard } from "@/components/ui/surfaces/StatCard";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { SessionStatusTag } from "@/components/scheduling/SessionStatusTag";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

function SessionRow({ session }: { session: SessionListItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
          {formatShortDateInLima(session.scheduledStart)} · {formatTimeInLima(session.scheduledStart)}–{formatTimeInLima(session.scheduledEnd)}
        </span>
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {session.classroomName}
        </span>
      </div>
      <SessionStatusTag status={session.status} size="sm" />
    </div>
  );
}

/** Portado de src/app/teacher/page.tsx -- 3 lecturas independientes (sesiones, salones,
 * disponibilidad) vía useQuery, cada una browser->Supabase->RLS. "Clases de hoy" se deriva en
 * memoria de las mismas sesiones ya cargadas, sin ninguna query adicional (mismo criterio Next). */
export function TeacherHomePage() {
  const { profile } = useAuth();
  const sessionsQuery = useSessions();
  const classroomsQuery = useMyClassroomsAsTeacher();
  const availabilityQuery = useAvailability();

  const isLoading = sessionsQuery.isLoading || classroomsQuery.isLoading || availabilityQuery.isLoading;
  const isError = sessionsQuery.isError || classroomsQuery.isError || availabilityQuery.isError;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (isError || !sessionsQuery.data || !classroomsQuery.data || !availabilityQuery.data) {
    return <EmptyState icon="warning" title="No pudimos cargar tu inicio">Recarga la página para intentarlo de nuevo.</EmptyState>;
  }

  const { upcoming, past } = sessionsQuery.data;
  const classrooms = classroomsQuery.data;
  const availability = availabilityQuery.data;
  const nextSession = upcoming[0];

  const { start: todayStart, end: todayEnd } = getTodayRangeInLima();
  const todaySessions = [...upcoming, ...past]
    .filter((s) => {
      const t = new Date(s.scheduledStart).getTime();
      return t >= todayStart.getTime() && t < todayEnd.getTime();
    })
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

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
        <Link to="/teacher/clases">
          <Button variant="accent" icon="video-camera">Mis clases</Button>
        </Link>
        <Link to="/teacher/salones">
          <Button variant="secondary" icon="chalkboard">Mis salones</Button>
        </Link>
        <Link to="/teacher/disponibilidad">
          <Button variant="secondary" icon="calendar-check">Mi disponibilidad</Button>
        </Link>
        <Link to="/teacher/perfil">
          <Button variant="secondary" icon="user-circle">Mi perfil</Button>
        </Link>
      </div>

      <Card header={cardTitle("Próxima clase")} pad={!nextSession}>
        {!nextSession ? <EmptyState icon="video-camera" title="No tienes próximas clases programadas" /> : <SessionRow session={nextSession} />}
      </Card>

      <Card header={cardTitle("Clases de hoy")} pad={todaySessions.length === 0}>
        {todaySessions.length === 0 ? (
          <EmptyState icon="calendar-blank" title="Sin clases hoy" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {todaySessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}
