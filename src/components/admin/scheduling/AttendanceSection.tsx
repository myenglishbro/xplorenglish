import { Card } from "@/components/ui/surfaces/Card";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { GenerateRosterButton } from "./GenerateRosterButton";
import { AttendanceTable } from "./AttendanceTable";
import type { AttendanceRosterItem, SessionStatus } from "@/server/scheduling/types";

export interface AttendanceSectionProps {
  sessionId: number;
  sessionStatus: SessionStatus;
  actualStart: string | null;
  actualEnd: string | null;
  roster: AttendanceRosterItem[];
}

function suggestedMinutesFrom(actualStart: string | null, actualEnd: string | null): number {
  if (!actualStart || !actualEnd) return 0;
  const minutes = Math.round((new Date(actualEnd).getTime() - new Date(actualStart).getTime()) / 60_000);
  return minutes > 0 ? minutes : 0;
}

/**
 * Título: "Asistencia y facturación". Tres estados posibles, ninguno se mezcla:
 * 1) scheduled sin roster -> estado vacío + Generar roster.
 * 2) scheduled con roster -> tabla de solo lectura, "Pendiente" (la sesión ni siquiera terminó).
 * 3) completed/cancelled -> tabla con acción Registrar/Editar por estudiante (set_student_session_billing).
 * rescheduled se trata como solo-lectura sin ninguna acción (no aplica facturación a una sesión
 * que nunca se va a completar).
 *
 * Server Component a propósito: solo arma qué variante de AttendanceTable (Client Component)
 * mostrar y le pasa datos planos (roster/sessionId/suggestedMinutes) -- las columnas de DataTable
 * (que llevan funciones `render`) viven enteramente en AttendanceTable, nunca acá, porque un
 * Server Component no puede pasarle funciones a un Client Component.
 */
export function AttendanceSection({ sessionId, sessionStatus, actualStart, actualEnd, roster }: AttendanceSectionProps) {
  const title = <span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Asistencia y facturación</span>;

  if (sessionStatus === "scheduled" && roster.length === 0) {
    return (
      <Card header={title}>
        <EmptyState icon="users-three" title="Todavía no hay asistencia generada">
          Genera el roster para ver a los estudiantes del salón antes de que empiece la clase, o espera a que se inicie automáticamente.
        </EmptyState>
        <div style={{ marginTop: "var(--space-4)" }}>
          <GenerateRosterButton sessionId={sessionId} />
        </div>
      </Card>
    );
  }

  if (sessionStatus === "scheduled") {
    return (
      <Card header={title}>
        <p style={{ margin: "0 0 var(--space-3)", color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
          La facturación estará disponible cuando la sesión se complete o se cancele.
        </p>
        <AttendanceTable variant="pending" sessionId={sessionId} roster={roster} />
      </Card>
    );
  }

  if (sessionStatus === "rescheduled") {
    if (roster.length === 0) {
      return (
        <Card header={title}>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
            Sesión reprogramada sin asistencia registrada -- no aplica facturación.
          </span>
        </Card>
      );
    }
    return (
      <Card header={title}>
        <p style={{ margin: "0 0 var(--space-3)", color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
          Sesión reprogramada -- esta asistencia queda congelada, sin facturación.
        </p>
        <AttendanceTable variant="rescheduled" sessionId={sessionId} roster={roster} />
      </Card>
    );
  }

  // completed | cancelled
  if (roster.length === 0) {
    return (
      <Card header={title}>
        <Alert tone="warning" title="Sin asistencia registrada">
          Esta sesión se cerró sin que nunca se generara el roster (initialize_session_attendance exige
          status=&apos;scheduled&apos;, así que ya no se puede generar retroactivamente). No hay nada que facturar aquí.
        </Alert>
      </Card>
    );
  }

  return (
    <Card header={title}>
      <AttendanceTable variant="billing" sessionId={sessionId} roster={roster} suggestedMinutes={suggestedMinutesFrom(actualStart, actualEnd)} />
    </Card>
  );
}
