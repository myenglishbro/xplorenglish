import { Link, useParams } from "react-router-dom";
import { useSessionDetail } from "@/features/schedulingAdmin/hooks";
import { useAssignableTeachers } from "@/features/classroomsAdmin/hooks";
import { Icon } from "@/components/ui/core/Icon";
import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { SessionStatusTag } from "@/components/scheduling/SessionStatusTag";
import { TeacherAssignment } from "@/components/scheduling/TeacherAssignment";
import { ReassignTeacherButton } from "@/components/admin/scheduling/ReassignTeacherButton";
import { CancelSessionButton } from "@/components/admin/scheduling/CancelSessionButton";
import { formatLongDateInLima, formatTimeInLima } from "@/lib/datetime/lima";

const CHANGE_TYPE_LABEL: Record<string, string> = {
  SCHEDULED_TEACHER_CHANGED: "Docente programado cambiado",
  ACTUAL_TEACHER_CHANGED: "Docente real cambiado",
};

/**
 * Portado de src/app/admin/calendario/[id]/page.tsx. Deliberadamente fuera de este pase:
 * RescheduleSessionButton (reprogramar) y AttendanceSection (asistencia/facturación) -- ver
 * informe final.
 */
export function SessionDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const { data: session, isLoading, isError } = useSessionDetail(sessionId);
  const teachersQuery = useAssignableTeachers();
  const teacherOptions = (teachersQuery.data ?? []).map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));

  if (!Number.isFinite(sessionId)) {
    return <EmptyState icon="warning" title="Esta sesión no existe">Vuelve al calendario.</EmptyState>;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (isError || !session) {
    return <EmptyState icon="warning" title="Esta sesión no existe">Vuelve al calendario.</EmptyState>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/calendario"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver al calendario
        </Link>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {session.classroomName}
          </h1>
          <SessionStatusTag status={session.status} />
        </div>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
          {formatLongDateInLima(new Date(session.scheduledStart))} · {formatTimeInLima(session.scheduledStart)}–{formatTimeInLima(session.scheduledEnd)}
        </p>
      </div>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Docente</span>}>
        <TeacherAssignment
          scheduledTeacherId={session.scheduledTeacherId}
          scheduledTeacherName={session.scheduledTeacherName}
          actualTeacherId={session.actualTeacherId}
          actualTeacherName={session.actualTeacherName}
        />
      </Card>

      {session.status === "scheduled" && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <ReassignTeacherButton sessionId={session.id} teacherOptions={teacherOptions} />
          <CancelSessionButton sessionId={session.id} />
        </div>
      )}

      {(session.rescheduledFromSessionId || session.rescheduledToSessionId) && (
        <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Historial de reprogramación</span>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {session.rescheduledFromSessionId && (
              <Link to={`/admin/calendario/${session.rescheduledFromSessionId}`} style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.4 var(--font-body)" }}>
                ← Ver sesión original (#{session.rescheduledFromSessionId})
              </Link>
            )}
            {session.rescheduledToSessionId && (
              <Link to={`/admin/calendario/${session.rescheduledToSessionId}`} style={{ font: "var(--weight-medium) var(--text-body-sm-size)/1.4 var(--font-body)" }}>
                Ver sesión reprogramada (#{session.rescheduledToSessionId}) →
              </Link>
            )}
          </div>
        </Card>
      )}

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Historial de cambios de docente</span>}>
        {session.teacherChanges.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Sin cambios registrados.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {session.teacherChanges.map((change) => (
              <div key={change.id} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-2)" }}>
                <div style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                  {CHANGE_TYPE_LABEL[change.changeType] ?? change.changeType}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>
                  {change.previousTeacherName ? `${change.previousTeacherName} → ` : ""}
                  {change.newTeacherName} · por {change.changedByName} · {formatLongDateInLima(new Date(change.changedAt))}
                </div>
                {change.reason && <div style={{ marginTop: 2, color: "var(--text-body)", fontSize: "var(--text-body-sm-size)" }}>{change.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
