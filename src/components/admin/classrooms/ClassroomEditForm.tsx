"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { updateClassroomAction, type ClassroomActionState } from "@/server/admin/classrooms/actions";
import { ACADEMIC_LEVELS, type ProgramOption } from "@/server/admin/users/types";
import type { ClassroomDetail } from "@/server/admin/classrooms/types";

export interface ClassroomEditFormProps {
  classroom: ClassroomDetail;
  programs: ProgramOption[];
}

export function ClassroomEditForm({ classroom, programs }: ClassroomEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<ClassroomActionState>({});
  const [saved, setSaved] = React.useState(false);
  const [level, setLevel] = React.useState(classroom.level);
  const [programId, setProgramId] = React.useState(String(classroom.programId));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    formData.set("level", level);
    formData.set("program_id", programId);
    try {
      const result = await updateClassroomAction(classroom.id, formData);
      setState(result);
      const ok = !result.error && !result.fieldErrors;
      setSaved(ok);
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  const programOptions = programs.map((p) => ({ value: String(p.id), label: p.name }));
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <Field label="Nombre" required htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={classroom.name} disabled={pending} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Programa" required htmlFor="program_id" error={state.fieldErrors?.program_id}>
          <Select id="program_id" value={programId} options={programOptions} onChange={(e) => setProgramId(e.target.value)} disabled={pending} />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={state.fieldErrors?.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as typeof level)} disabled={pending} />
        </Field>
      </div>

      <Field label="Descripción" htmlFor="description" error={state.fieldErrors?.description}>
        <Input id="description" name="description" defaultValue={classroom.description ?? ""} disabled={pending} />
      </Field>

      <Field label="Horario" htmlFor="schedule_notes" hint="Texto libre, ej. Lun/Mié 6-8pm" error={state.fieldErrors?.schedule_notes}>
        <Input id="schedule_notes" name="schedule_notes" defaultValue={classroom.scheduleNotes ?? ""} disabled={pending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
