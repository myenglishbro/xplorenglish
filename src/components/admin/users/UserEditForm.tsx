"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { updateUserProfileAction, type UpdateUserProfileActionState } from "@/server/admin/users/actions";
import { ACADEMIC_LEVELS, type ProgramOption, type UserDetail } from "@/server/admin/users/types";

export interface UserEditFormProps {
  user: UserDetail;
  programs: ProgramOption[];
}

export function UserEditForm({ user, programs }: UserEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<UpdateUserProfileActionState>({});
  const [saved, setSaved] = React.useState(false);
  const [level, setLevel] = React.useState(user.level);
  const [programId, setProgramId] = React.useState(user.programId ? String(user.programId) : "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    // Select es un componente controlado sin `name`/submit nativo -- se agregan su
    // valor actual al FormData explícitamente, en vez de convertirlo en un <select> nativo.
    formData.set("level", level);
    formData.set("program_id", programId);
    try {
      const result = await updateUserProfileAction(user.id, formData);
      setState(result);
      const ok = !result.error && !result.fieldErrors;
      setSaved(ok);
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  const programOptions = [{ value: "", label: "Sin programa" }, ...programs.map((p) => ({ value: String(p.id), label: p.name }))];
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="first_name" error={state.fieldErrors?.first_name}>
          <Input id="first_name" name="first_name" defaultValue={user.firstName} disabled={pending} />
        </Field>
        <Field label="Apellido" required htmlFor="last_name" error={state.fieldErrors?.last_name}>
          <Input id="last_name" name="last_name" defaultValue={user.lastName} disabled={pending} />
        </Field>
        <Field label="DNI" required htmlFor="dni" error={state.fieldErrors?.dni}>
          <Input id="dni" name="dni" defaultValue={user.dni} disabled={pending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={user.phone} disabled={pending} />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={state.fieldErrors?.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as UserDetail["level"])} disabled={pending} />
        </Field>
        <Field label="Programa" htmlFor="program_id" error={state.fieldErrors?.program_id}>
          <Select id="program_id" value={programId} options={programOptions} onChange={(e) => setProgramId(e.target.value)} disabled={pending} />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
