import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Textarea } from "@/components/ui/forms/Textarea";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { useUpdateTeacherProfile, type UpdateTeacherProfileFieldErrors } from "@/features/teachers/hooks";
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
 * Solo edita teacher_profiles (hourly_rate/bio/status) -- nunca profiles.role ni
 * classroom_teachers. Para cambiar asignaciones de salón, el admin sigue yendo a
 * /admin/salones/:id (no se duplica esa UI acá).
 */
export function TeacherProfileForm({ profileId, hourlyRate, bio, status }: TeacherProfileFormProps) {
  const mutation = useUpdateTeacherProfile(profileId);
  const [fieldErrors, setFieldErrors] = React.useState<UpdateTeacherProfileFieldErrors>({});
  const [saved, setSaved] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<string>(status);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({
        hourlyRate: formData.get("hourlyRate"),
        bio: formData.get("bio"),
        status: statusValue,
      });
      setSaved(true);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: UpdateTeacherProfileFieldErrors }).fieldErrors);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}
      {saved && <Alert tone="success">Los cambios se guardaron correctamente.</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Tarifa por hora (PEN)" required htmlFor="hourlyRate" error={fieldErrors.hourlyRate}>
          <Input id="hourlyRate" name="hourlyRate" type="number" min={0} step="0.01" defaultValue={hourlyRate} disabled={mutation.isPending} />
        </Field>
        <Field label="Estado docente" required htmlFor="status" error={fieldErrors.status}>
          <Select id="status" value={statusValue} options={STATUS_OPTIONS} onChange={(e) => setStatusValue(e.target.value)} disabled={mutation.isPending} />
        </Field>
      </div>

      <Field label="Bio" htmlFor="bio" error={fieldErrors.bio}>
        <Textarea id="bio" name="bio" rows={3} defaultValue={bio ?? ""} disabled={mutation.isPending} />
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
