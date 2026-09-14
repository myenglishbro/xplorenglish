import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Select } from "@/components/ui/forms/Select";
import { WeeklyScheduleList } from "./WeeklyScheduleList";
import type { ClassScheduleItem, ClassroomOption } from "@/server/scheduling/types";

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

          {classroomId && <WeeklyScheduleList classroomId={Number(classroomId)} schedules={classroomSchedules} />}
        </div>
      </Modal>
    </>
  );
}
