import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Switch } from "@/components/ui/forms/Switch";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useCreateClassSchedule, useSetClassScheduleActive, type ClassScheduleFieldErrors } from "@/features/schedulingAdmin/hooks";
import { DAY_OF_WEEK_LABELS, type ClassScheduleItem, type ClassroomOption } from "@/server/scheduling/types";

export interface ClassSchedulesButtonProps {
  classrooms: ClassroomOption[];
  schedules: ClassScheduleItem[];
}

/**
 * class_schedules = plantilla semanal recurrente, deliberadamente separada de sessions (clases
 * concretas) -- crear/editar un horario acá NUNCA genera sesiones por sí solo; eso es un paso
 * explícito aparte (ver GenerateSessionsButton). Sin UI optimista.
 */
export function ClassSchedulesButton({ classrooms, schedules }: ClassSchedulesButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [classroomId, setClassroomId] = React.useState("");

  const classroomOptions = [{ value: "", label: "Selecciona un salón" }, ...classrooms.map((c) => ({ value: String(c.id), label: c.name }))];
  const classroomSchedules = schedules.filter((s) => s.classroomId === Number(classroomId));

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon="calendar-check"
        onClick={() => {
          setClassroomId("");
          setOpen(true);
        }}
      >
        Horarios semanales
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Horarios semanales" width={620}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Field label="Salón" htmlFor="scheduleClassroomId">
            <Select id="scheduleClassroomId" value={classroomId} options={classroomOptions} onChange={(e) => setClassroomId(e.target.value)} />
          </Field>

          {classroomId && (
            <>
              {classroomSchedules.length === 0 ? (
                <EmptyState icon="calendar-blank" title="Sin horarios todavía">
                  Agrega el primero abajo.
                </EmptyState>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {classroomSchedules.map((schedule) => (
                    <ScheduleRow key={schedule.id} schedule={schedule} />
                  ))}
                </div>
              )}

              <AddScheduleForm classroomId={Number(classroomId)} />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

function ScheduleRow({ schedule }: { schedule: ClassScheduleItem }) {
  const mutation = useSetClassScheduleActive();

  async function handleToggle() {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync({ scheduleId: schedule.id, isActive: !schedule.isActive });
    } catch {
      // el error ya queda en mutation.error, se muestra debajo
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
            {schedule.startTime.slice(0, 5)} – {schedule.endTime.slice(0, 5)}
          </span>
          {!schedule.isActive && (
            <Tag tone="neutral" size="sm">
              Inactivo
            </Tag>
          )}
        </span>
        <Switch checked={schedule.isActive} onChange={handleToggle} disabled={mutation.isPending} />
      </div>
      {mutation.isError && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
    </div>
  );
}

function AddScheduleForm({ classroomId }: { classroomId: number }) {
  const formId = React.useId();
  const mutation = useCreateClassSchedule(classroomId);
  const [fieldErrors, setFieldErrors] = React.useState<ClassScheduleFieldErrors>({});
  const [dayOfWeek, setDayOfWeek] = React.useState("1");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    try {
      await mutation.mutateAsync({ dayOfWeek: Number(dayOfWeek), startTime, endTime });
      setStartTime("");
      setEndTime("");
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ClassScheduleFieldErrors }).fieldErrors);
      }
    }
  }

  const dayOptions = DAY_OF_WEEK_LABELS.map((label, index) => ({ value: String(index), label }));

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}
    >
      {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Día" htmlFor="dayOfWeek" error={fieldErrors.dayOfWeek}>
          <Select id="dayOfWeek" value={dayOfWeek} options={dayOptions} onChange={(e) => setDayOfWeek(e.target.value)} disabled={mutation.isPending} />
        </Field>
        <Field label="Inicio" htmlFor="scheduleStartTime" error={fieldErrors.startTime}>
          <Input id="scheduleStartTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={mutation.isPending} />
        </Field>
        <Field label="Fin" htmlFor="scheduleEndTime" error={fieldErrors.endTime}>
          <Input id="scheduleEndTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={mutation.isPending} />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="secondary" size="sm" icon="plus" loading={mutation.isPending} disabled={mutation.isPending}>
          Agregar horario
        </Button>
      </div>
    </form>
  );
}
