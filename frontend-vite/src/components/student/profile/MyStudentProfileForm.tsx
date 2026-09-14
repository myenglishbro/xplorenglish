"use client";

import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useUpdateMyStudentProfile } from "@/features/profile/hooks";
import { updateMyStudentProfileSchema, type UpdateMyStudentProfileInput } from "@/server/student/profile/validation";
import type { MyStudentProfile } from "@/server/student/profile/types";

export interface MyStudentProfileFormProps {
  profile: MyStudentProfile;
}

type FieldErrors = Partial<Record<keyof UpdateMyStudentProfileInput, string>>;

export function MyStudentProfileForm({ profile }: MyStudentProfileFormProps) {
  const [firstName, setFirstName] = React.useState(profile.firstName);
  const [lastName, setLastName] = React.useState(profile.lastName);
  const [phone, setPhone] = React.useState(profile.phone);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [error, setError] = React.useState<string | undefined>();
  const [saved, setSaved] = React.useState(false);
  const updateProfile = useUpdateMyStudentProfile();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateProfile.isPending) return;
    setError(undefined);
    setFieldErrors({});
    setSaved(false);

    const parsed = updateMyStudentProfileSchema.safeParse({ firstName, lastName, phone });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errs[key as keyof UpdateMyStudentProfileInput] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      await updateProfile.mutateAsync(parsed.data);
      setSaved(true);
    } catch {
      setError("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="firstName" error={fieldErrors.firstName}>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={updateProfile.isPending} />
        </Field>
        <Field label="Apellido" required htmlFor="lastName" error={fieldErrors.lastName}>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={updateProfile.isPending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={fieldErrors.phone}>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={updateProfile.isPending} />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="primary" loading={updateProfile.isPending} disabled={updateProfile.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
