import React from "react";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useCreateClassroom, type ClassroomFieldErrors } from "@/features/classroomsAdmin/hooks";
import { ACADEMIC_LEVELS, type AcademicLevel, type ProgramOption } from "@/server/admin/users/types";

export interface CreateClassroomFormProps {
  programs: ProgramOption[];
}

export function CreateClassroomForm({ programs }: CreateClassroomFormProps) {
  const navigate = useNavigate();
  const mutation = useCreateClassroom();
  const [fieldErrors, setFieldErrors] = React.useState<ClassroomFieldErrors>({});
  const [level, setLevel] = React.useState<AcademicLevel>("A1");
  const [programId, setProgramId] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    try {
      const classroomId = await mutation.mutateAsync({
        name: String(formData.get("name") ?? ""),
        program_id: programId ? Number(programId) : (undefined as unknown as number),
        level,
        description: String(formData.get("description") ?? ""),
        schedule_notes: String(formData.get("schedule_notes") ?? ""),
      });
      navigate(`/admin/salones/${classroomId}`, { state: { justCreated: true } });
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="name" error={fieldErrors.name}>
          <Input id="name" name="name" disabled={mutation.isPending} />
        </Field>
        <Field label="Programa" required htmlFor="program_id" error={fieldErrors.program_id}>
          <Select
            id="program_id"
            value={programId}
            options={programOptions}
            placeholder="Selecciona un programa"
            onChange={(e) => setProgramId(e.target.value)}
            disabled={mutation.isPending}
          />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={fieldErrors.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as AcademicLevel)} disabled={mutation.isPending} />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="description" error={fieldErrors.description}>
        <Input id="description" name="description" disabled={mutation.isPending} />
      </Field>

      <Field label="Notas del horario (opcional)" htmlFor="schedule_notes" hint="Texto libre, no reemplaza el horario semanal (se define después de crear el salón)" error={fieldErrors.schedule_notes}>
        <Input id="schedule_notes" name="schedule_notes" disabled={mutation.isPending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" icon="chalkboard" loading={mutation.isPending} disabled={mutation.isPending}>
          Crear salón
        </Button>
      </div>
    </form>
  );
}
