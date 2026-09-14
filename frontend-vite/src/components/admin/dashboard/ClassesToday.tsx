import { Avatar } from "@/components/ui/surfaces/Avatar";
import { Badge } from "@/components/ui/core/Badge";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import type { ClassesToday as ClassesTodayData } from "@/server/dashboard/types";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

export function ClassesToday({ classes }: { classes: ClassesTodayData }) {
  if (classes.sessions.length === 0) {
    return (
      <EmptyState icon="calendar-blank" title="No hay clases programadas">
        No se encontraron clases para hoy ni sesiones futuras próximas.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {classes.mode === "upcoming" && (
        <div style={{ font: "var(--weight-semibold) var(--text-caption-size)/1.3 var(--font-body)", color: "var(--text-muted)" }}>
          No hay clases programadas para hoy. Mostrando las próximas clases:
        </div>
      )}
      {classes.sessions.map((session) => (
        <div
          key={session.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Avatar name={session.teacherName ?? "?"} subtitle={session.classroomName} tone="accent" />
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
              {classes.mode === "upcoming" ? `${formatShortDateInLima(session.scheduledStart)} · ` : ""}
              {formatTimeInLima(session.scheduledStart)}
            </div>
            <Badge tone={session.status === "cancelled" ? "danger" : "neutral"} style={{ marginTop: 4 }}>
              {STATUS_LABEL[session.status] ?? session.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
