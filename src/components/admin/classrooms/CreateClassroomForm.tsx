"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { createClassroomAction, type CreateClassroomActionState } from "@/server/admin/classrooms/actions";
import { ACADEMIC_LEVELS, type AcademicLevel, type ProgramOption } from "@/server/admin/users/types";

export interface CreateClassroomFormProps {
  programs: ProgramOption[];
}

export function CreateClassroomForm({ programs }: CreateClassroomFormProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<CreateClassroomActionState>({});
  const [level, setLevel] = React.useState<AcademicLevel>("A1");
  const [programId, setProgramId] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});
    const formData = new FormData(event.currentTarget);
    formData.set("level", level);
    formData.set("program_id", programId);
    try {
      const result = await createClassroomAction(formData);
      setState(result);
      if (result.success) {
        router.push(`/admin/salones/${result.success.classroomId}`);
      }
    } finally {
      setPending(false);
    }
  }

  const programOptions = programs.map((p) => ({ value: String(p.id), label: p.name }));
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" disabled={pending} />
        </Field>
        <Field label="Programa" required htmlFor="program_id" error={state.fieldErrors?.program_id}>
          <Select
            id="program_id"
            value={programId}
            options={programOptions}
            placeholder="Selecciona un programa"
            onChange={(e) => setProgramId(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={state.fieldErrors?.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as AcademicLevel)} disabled={pending} />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="description" error={state.fieldErrors?.description}>
        <Input id="description" name="description" disabled={pending} />
      </Field>

      <Field label="Horario" htmlFor="schedule_notes" hint="Texto libre, ej. Lun/Mié 6-8pm" error={state.fieldErrors?.schedule_notes}>
        <Input id="schedule_notes" name="schedule_notes" disabled={pending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" icon="chalkboard" loading={pending} disabled={pending}>
          Crear salón
        </Button>
      </div>
    </form>
  );
}
