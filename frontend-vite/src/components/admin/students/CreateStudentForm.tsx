import React from "react";
import { Link } from "react-router-dom";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { TempPasswordReveal } from "@/components/admin/shared/TempPasswordReveal";
import { useCreateStudent, type CreateStudentFieldErrors } from "@/features/students/hooks";
import { ACADEMIC_LEVELS, type AcademicLevel, type ProgramOption } from "@/server/admin/users/types";

export interface CreateStudentFormProps {
  programs: ProgramOption[];
}

export function CreateStudentForm({ programs }: CreateStudentFormProps) {
  const mutation = useCreateStudent();
  const [fieldErrors, setFieldErrors] = React.useState<CreateStudentFieldErrors>({});
  const [level, setLevel] = React.useState<AcademicLevel>("A1");
  const [programId, setProgramId] = React.useState("");
  const [success, setSuccess] = React.useState<{ profileId: string; email: string; tempPassword: string } | undefined>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    try {
      const result = await mutation.mutateAsync({
        first_name: String(formData.get("first_name") ?? ""),
        last_name: String(formData.get("last_name") ?? ""),
        dni: String(formData.get("dni") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        program_id: programId ? Number(programId) : (undefined as unknown as number),
        level,
      });
      setSuccess(result);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: CreateStudentFieldErrors }).fieldErrors);
      }
    }
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <h3 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
            Estudiante creado correctamente
          </h3>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
            Cuenta creada para <strong>{success.email}</strong>. Inicia sesión con este correo y la contraseña de abajo.
          </p>
        </div>
        <TempPasswordReveal password={success.tempPassword} label="Contraseña temporal del estudiante" />
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
          <Link to={`/admin/usuarios/${success.profileId}`}>
            <Button variant="accent">Ver estudiante</Button>
          </Link>
          <Link to="/admin/estudiantes">
            <Button variant="secondary">Volver a estudiantes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const programOptions = programs.map((p) => ({ value: String(p.id), label: p.name }));
  const levelOptions = ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }));

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {mutation.isError && !Object.keys(fieldErrors).length && <Alert tone="danger">{(mutation.error as Error).message}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="first_name" error={fieldErrors.first_name}>
          <Input id="first_name" name="first_name" disabled={mutation.isPending} />
        </Field>
        <Field label="Apellido" required htmlFor="last_name" error={fieldErrors.last_name}>
          <Input id="last_name" name="last_name" disabled={mutation.isPending} />
        </Field>
        <Field label="DNI" required htmlFor="dni" error={fieldErrors.dni}>
          <Input id="dni" name="dni" disabled={mutation.isPending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={fieldErrors.phone}>
          <Input id="phone" name="phone" type="tel" disabled={mutation.isPending} />
        </Field>
        <Field label="Correo" required htmlFor="email" error={fieldErrors.email} hint="El estudiante iniciará sesión con este correo">
          <Input id="email" name="email" type="email" icon="envelope-simple" disabled={mutation.isPending} />
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
          <Select
            id="level"
            value={level}
            options={levelOptions}
            onChange={(e) => setLevel(e.target.value as AcademicLevel)}
            disabled={mutation.isPending}
          />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="primary" icon="user-plus" loading={mutation.isPending} disabled={mutation.isPending}>
          Crear estudiante
        </Button>
      </div>
    </form>
  );
}
