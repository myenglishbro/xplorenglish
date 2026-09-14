import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useUpdateUserProfile, type UpdateUserProfileFieldErrors } from "@/features/users/hooks";
import { ACADEMIC_LEVELS, type ProgramOption, type UserDetail } from "@/server/admin/users/types";

export interface UserEditFormProps {
  user: UserDetail;
  programs: ProgramOption[];
}

export function UserEditForm({ user, programs }: UserEditFormProps) {
  const mutation = useUpdateUserProfile(user.id);
  const [fieldErrors, setFieldErrors] = React.useState<UpdateUserProfileFieldErrors>({});
  const [saved, setSaved] = React.useState(false);
  const [level, setLevel] = React.useState(user.level);
  const [programId, setProgramId] = React.useState(user.programId ? String(user.programId) : "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const formData = new FormData(event.currentTarget);
    setFieldErrors({});
    setSaved(false);
    try {
      await mutation.mutateAsync({
        first_name: String(formData.get("first_name") ?? ""),
        last_name: String(formData.get("last_name") ?? ""),
        dni: String(formData.get("dni") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        level,
        program_id: programId ? Number(programId) : null,
      });
      setSaved(true);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: UpdateUserProfileFieldErrors }).fieldErrors);
      }
    }
  }

  const programOptions = [{ value: "", label: "Sin programa" }, ...programs.map((p) => ({ value: String(p.id), label: p.name }))];
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="first_name" error={fieldErrors.first_name}>
          <Input id="first_name" name="first_name" defaultValue={user.firstName} disabled={mutation.isPending} />
        </Field>
        <Field label="Apellido" required htmlFor="last_name" error={fieldErrors.last_name}>
          <Input id="last_name" name="last_name" defaultValue={user.lastName} disabled={mutation.isPending} />
        </Field>
        <Field label="DNI" required htmlFor="dni" error={fieldErrors.dni}>
          <Input id="dni" name="dni" defaultValue={user.dni} disabled={mutation.isPending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={fieldErrors.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={user.phone} disabled={mutation.isPending} />
        </Field>
        <Field label="Nivel" required htmlFor="level" error={fieldErrors.level}>
          <Select id="level" value={level} options={levelOptions} onChange={(e) => setLevel(e.target.value as UserDetail["level"])} disabled={mutation.isPending} />
        </Field>
        <Field label="Programa" htmlFor="program_id" error={fieldErrors.program_id}>
          <Select id="program_id" value={programId} options={programOptions} onChange={(e) => setProgramId(e.target.value)} disabled={mutation.isPending} />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
