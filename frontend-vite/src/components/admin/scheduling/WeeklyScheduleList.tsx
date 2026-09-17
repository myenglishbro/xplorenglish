import { Switch } from "@/components/ui/forms/Switch";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ConfirmActionButton } from "@/components/scheduling/ConfirmActionButton";
import { useSetClassScheduleActive, useDeleteClassSchedule } from "@/features/schedulingAdmin/hooks";
import { DAY_OF_WEEK_LABELS, type ClassScheduleItem } from "@/server/scheduling/types";
import { ClassScheduleBlockButton } from "./ClassScheduleBlockButton";

export interface WeeklyScheduleListProps {
  classroomId: number;
  /** Ya filtrado al salón correspondiente y ordenado (día/hora) por el caller. */
  schedules: ClassScheduleItem[];
}

/**
 * Lista + alta/edición/baja de class_schedules de UN salón, sin el <Select> de elegir salón porque
 * acá el salón ya está fijo. Único consumidor actual: /admin/salones/:id (SalonDetailAdminPage) --
 * el calendario global (/admin/calendario) fue retirado, ver components/admin/dashboard/Header.tsx.
 */
export function WeeklyScheduleList({ classroomId, schedules }: WeeklyScheduleListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {schedules.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin horarios todavía">
          Agrega el primer bloque abajo.
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {schedules.map((schedule) => (
            <ScheduleRow key={schedule.id} classroomId={classroomId} schedule={schedule} />
          ))}
        </div>
      )}

      <div>
        <ClassScheduleBlockButton mode="create" classroomId={classroomId} triggerLabel="+ Agregar horario" triggerVariant="secondary" triggerIcon="plus" />
      </div>
    </div>
  );
}

function ScheduleRow({ classroomId, schedule }: { classroomId: number; schedule: ClassScheduleItem }) {
  const toggleMutation = useSetClassScheduleActive(classroomId);
  const deleteMutation = useDeleteClassSchedule(classroomId);
  const timeRangeLabel = `${schedule.startTime.slice(0, 5)} – ${schedule.endTime.slice(0, 5)}`;

  async function handleToggle() {
    if (toggleMutation.isPending) return;
    try {
      await toggleMutation.mutateAsync({ scheduleId: schedule.id, isActive: !schedule.isActive });
    } catch {
      // el error ya queda en toggleMutation.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-card)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
            {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>{timeRangeLabel}</span>
          {!schedule.isActive && (
            <Tag tone="neutral" size="sm">
              Inactivo
            </Tag>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClassScheduleBlockButton mode="edit" classroomId={classroomId} schedule={schedule} triggerLabel="Editar" triggerVariant="ghost" triggerSize="sm" />
          <Switch checked={schedule.isActive} onChange={handleToggle} disabled={toggleMutation.isPending} />
          <ConfirmActionButton
            label="Eliminar"
            icon="trash"
            variant="ghost"
            size="sm"
            confirmTitle="Eliminar horario"
            confirmDescription={`Se eliminará el bloque ${DAY_OF_WEEK_LABELS[schedule.dayOfWeek]} ${timeRangeLabel}. Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            action={async () => {
              try {
                await deleteMutation.mutateAsync(schedule.id);
                return {};
              } catch (err) {
                return { error: err instanceof Error ? err.message : "No pudimos eliminar el horario. Inténtalo de nuevo en unos minutos." };
              }
            }}
          />
        </span>
      </div>
      {toggleMutation.isError && <Alert tone="danger">{(toggleMutation.error as Error).message}</Alert>}
    </div>
  );
}
