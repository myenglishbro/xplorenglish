"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { updateTeacherProfileAction, type UpdateTeacherProfileActionState } from "@/server/admin/teachers/actions";
import type { TeacherProfileStatus } from "@/server/admin/teachers/types";

export interface TeacherProfileFormProps {
  profileId: string;
  hourlyRate: number;
  bio: string | null;
  status: TeacherProfileStatus;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

/**
 * Solo edita teacher_profiles (hourly_rate/bio/status vía updateTeacherProfileAction) -- nunca
 * profiles.role ni classroom_teachers. Para cambiar asignaciones de salón, el admin sigue yendo
 * a /admin/salones/[id] (no se duplica esa UI acá).
 */
export function TeacherProfileForm({ profileId, hourlyRate, bio, status }: TeacherProfileFormProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<UpdateTeacherProfileActionState>({});
  const [saved, setSaved] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<string>(status);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    // Select es controlado sin submit nativo -- mismo criterio que UserEditForm con "level".
    formData.set("status", statusValue);
    try {
      const result = await updateTeacherProfileAction(profileId, formData);
      setState(result);
      const ok = !result.error && !result.fieldErrors;
      setSaved(ok);
      if (ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Tarifa por hora (PEN)" required htmlFor="hourlyRate" error={state.fieldErrors?.hourlyRate}>
          <Input id="hourlyRate" name="hourlyRate" type="number" min={0} step="0.01" defaultValue={hourlyRate} disabled={pending} />
        </Field>
        <Field label="Estado docente" required htmlFor="status" error={state.fieldErrors?.status}>
          <Select id="status" value={statusValue} options={STATUS_OPTIONS} onChange={(e) => setStatusValue(e.target.value)} disabled={pending} />
        </Field>
      </div>

      <Field label="Bio" htmlFor="bio" error={state.fieldErrors?.bio}>
        <Textarea id="bio" name="bio" rows={3} defaultValue={bio ?? ""} disabled={pending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
