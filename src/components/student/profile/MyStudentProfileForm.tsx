"use client";

import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { updateMyStudentProfileAction, type UpdateMyStudentProfileActionState } from "@/server/student/profile/actions";
import type { MyStudentProfile } from "@/server/student/profile/types";

export interface MyStudentProfileFormProps {
  profile: MyStudentProfile;
}

/** Solo nombre/apellido/teléfono -- DNI, email, nivel, programa y estado se muestran aparte,
 * como texto, en el Server Component que renderiza este form (nunca como inputs de este
 * formulario). */
export function MyStudentProfileForm({ profile }: MyStudentProfileFormProps) {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<UpdateMyStudentProfileActionState>({});
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setState({});
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const result = await updateMyStudentProfileAction(formData);
    setState(result);
    setSaved(!result.error && !result.fieldErrors);
    setPending(false);
    // La action revalida /student/perfil; el RSC actualiza perfil y shell.
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="firstName" error={state.fieldErrors?.firstName}>
          <Input id="firstName" name="firstName" defaultValue={profile.firstName} disabled={pending} />
        </Field>
        <Field label="Apellido" required htmlFor="lastName" error={state.fieldErrors?.lastName}>
          <Input id="lastName" name="lastName" defaultValue={profile.lastName} disabled={pending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} disabled={pending} />
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
