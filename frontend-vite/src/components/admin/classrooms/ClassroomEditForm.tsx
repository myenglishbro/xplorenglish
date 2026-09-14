import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useUpdateClassroom, type ClassroomFieldErrors } from "@/features/classroomsAdmin/hooks";
import { ACADEMIC_LEVELS, type ProgramOption } from "@/server/admin/users/types";
import type { ClassroomDetail } from "@/server/admin/classrooms/types";

export interface ClassroomEditFormProps {
  classroom: ClassroomDetail;
  programs: ProgramOption[];
}

export function ClassroomEditForm({ classroom, programs }: ClassroomEditFormProps) {
  const mutation = useUpdateClassroom(classroom.id);
  const [fieldErrors, setFieldErrors] = React.useState<ClassroomFieldErrors>({});
  const [saved, setSaved] = React.useState(false);
  const [level, setLevel] = React.useState(classroom.level);
  const [programId, setProgramId] = React.useState(String(classroom.programId));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({
        name: String(formData.get("name") ?? ""),
        program_id: programId ? Number(programId) : (undefined as unknown as number),
        level,
        description: String(formData.get("description") ?? ""),
        schedule_notes: String(formData.get("schedule_notes") ?? ""),
      });
      setSaved(true);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: ClassroomFieldErrors }).fieldErrors);
      }
    }
  }

  const programOptions = programs.map((p) => ({ value: String(p.id), label: p.name }));
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <Field label="Nombre" required htmlFor="name" error={fieldErrors.name}>
        <Input id="name" name="name" defaultValue={classroom.name} disabled={mutation.isPending} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Programa" required htmlFor="program_id" error={fieldErrors.program_id}>
          <Select id="program_id" value={programId} options={programOptions} onChange={(e) => setProgramId(e.target.value)} disabled={mutation.isPending} />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={fieldErrors.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as typeof level)} disabled={mutation.isPending} />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="description" error={fieldErrors.description}>
        <Input id="description" name="description" defaultValue={classroom.description ?? ""} disabled={mutation.isPending} />
      </Field>

      <Field label="Notas del horario (opcional)" htmlFor="schedule_notes" hint="Texto libre, no reemplaza el horario semanal (ver sección Horario semanal más abajo)" error={fieldErrors.schedule_notes}>
        <Input id="schedule_notes" name="schedule_notes" defaultValue={classroom.scheduleNotes ?? ""} disabled={mutation.isPending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
