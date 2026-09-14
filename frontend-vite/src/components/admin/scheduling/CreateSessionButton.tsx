import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Modal } from "@/components/ui/surfaces/Modal";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateSession, type CreateSessionFieldErrors } from "@/features/schedulingAdmin/hooks";
import type { ClassroomOption } from "@/server/scheduling/types";

export interface CreateSessionButtonProps {
  classrooms: ClassroomOption[];
  teacherOptions: { id: string; name: string }[];
  primaryTeacherByClassroom: Record<number, string>;
}

export function CreateSessionButton({ classrooms, teacherOptions, primaryTeacherByClassroom }: CreateSessionButtonProps) {
  const formId = React.useId();
  const mutation = useCreateSession();
  const [open, setOpen] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<CreateSessionFieldErrors>({});
  const [classroomId, setClassroomId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  function handleOpen() {
    setFieldErrors({});
    setClassroomId("");
    setTeacherId("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setOpen(true);
  }

  function handleClassroomChange(value: string) {
    setClassroomId(value);
    const defaultTeacher = primaryTeacherByClassroom[Number(value)];
    if (defaultTeacher) setTeacherId(defaultTeacher);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    try {
      await mutation.mutateAsync({
        classroomId: Number(classroomId),
        scheduledTeacherId: teacherId,
        date,
        startTime,
        endTime,
      });
      setOpen(false);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: CreateSessionFieldErrors }).fieldErrors);
      }
    }
  }

  const classroomOptions = [{ value: "", label: "Selecciona un salón" }, ...classrooms.map((c) => ({ value: String(c.id), label: c.name }))];
  const teacherSelectOptions = [{ value: "", label: "Selecciona un docente" }, ...teacherOptions.map((t) => ({ value: t.id, label: t.name }))];

  return (
    <>
      <Button variant="primary" size="sm" icon="plus" onClick={handleOpen}>
        Nueva sesión
      </Button>
      <Modal
        open={open}
        onClose={() => (mutation.isPending ? undefined : setOpen(false))}
        title="Crear sesión"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Crear
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
          <Field label="Salón" required htmlFor="classroomId" error={fieldErrors.classroomId}>
            <Select id="classroomId" value={classroomId} options={classroomOptions} onChange={(e) => handleClassroomChange(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <Field label="Docente" required htmlFor="scheduledTeacherId" error={fieldErrors.scheduledTeacherId} hint="Se prellena con el titular activo del salón; puedes cambiarlo.">
            <Select id="scheduledTeacherId" value={teacherId} options={teacherSelectOptions} onChange={(e) => setTeacherId(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <Field label="Fecha" required htmlFor="date" error={fieldErrors.date}>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={mutation.isPending} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Field label="Hora de inicio" required htmlFor="startTime" error={fieldErrors.startTime}>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={mutation.isPending} />
            </Field>
            <Field label="Hora de fin" required htmlFor="endTime" error={fieldErrors.endTime}>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={mutation.isPending} />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
