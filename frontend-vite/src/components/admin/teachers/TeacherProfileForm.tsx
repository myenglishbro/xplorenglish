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
  /** teacher_profiles.receipt_drive_url (FIX 2, segunda etapa) -- carpeta de Google Drive donde el
   * docente sube sus recibos por honorarios. Xplore solo guarda y abre esta URL. */
  receiptDriveUrl: string | null;
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
export function TeacherProfileForm({ profileId, hourlyRate, bio, status, receiptDriveUrl }: TeacherProfileFormProps) {
  const mutation = useUpdateTeacherProfile(profileId);
  const [fieldErrors, setFieldErrors] = React.useState<UpdateTeacherProfileFieldErrors>({});
  const [saved, setSaved] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<string>(status);
  const [receiptDriveUrlValue, setReceiptDriveUrlValue] = React.useState<string>(receiptDriveUrl ?? "");

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
        receiptDriveUrl: formData.get("receiptDriveUrl"),
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

      <Field
        label="Carpeta de recibos por honorarios (Google Drive)"
        htmlFor="receiptDriveUrl"
        error={fieldErrors.receiptDriveUrl}
        hint="Enlace a la carpeta de Google Drive donde el docente subirá sus recibos por honorarios."
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Input
              id="receiptDriveUrl"
              name="receiptDriveUrl"
              type="url"
              placeholder="https://drive.google.com/drive/folders/…"
              value={receiptDriveUrlValue}
              onChange={(e) => setReceiptDriveUrlValue(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          {receiptDriveUrlValue.trim().length > 0 && (
            <a href={receiptDriveUrlValue.trim()} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost" size="sm">
                Abrir carpeta
              </Button>
            </a>
          )}
        </div>
      </Field>

      <div>
        <Button type="submit" variant="primary" loading={mutation.isPending} disabled={mutation.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
