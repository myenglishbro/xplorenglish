"use client";

import React from "react";
import Link from "next/link";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { TempPasswordReveal } from "@/components/admin/shared/TempPasswordReveal";
import { createStudentAction, type CreateStudentActionState } from "@/server/admin/students/actions";
import { ACADEMIC_LEVELS, type AcademicLevel, type ProgramOption } from "@/server/admin/users/types";

export interface CreateStudentFormProps {
  programs: ProgramOption[];
}

export function CreateStudentForm({ programs }: CreateStudentFormProps) {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<CreateStudentActionState>({});
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
      const result = await createStudentAction(formData);
      setState(result);
    } finally {
      setPending(false);
    }
  }

  if (state.success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <h3 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
            Estudiante creado correctamente
          </h3>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
            Cuenta creada para <strong>{state.success.email}</strong>. Inicia sesión con este correo y la contraseña de abajo.
          </p>
        </div>
        <TempPasswordReveal password={state.success.tempPassword} label="Contraseña temporal del estudiante" />
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
          <Link href={`/admin/usuarios/${state.success.profileId}`}>
            <Button variant="accent">Ver estudiante</Button>
          </Link>
          <Link href="/admin/estudiantes">
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
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <Field label="Nombre" required htmlFor="first_name" error={state.fieldErrors?.first_name}>
          <Input id="first_name" name="first_name" disabled={pending} />
        </Field>
        <Field label="Apellido" required htmlFor="last_name" error={state.fieldErrors?.last_name}>
          <Input id="last_name" name="last_name" disabled={pending} />
        </Field>
        <Field label="DNI" required htmlFor="dni" error={state.fieldErrors?.dni}>
          <Input id="dni" name="dni" disabled={pending} />
        </Field>
        <Field label="Teléfono" required htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" disabled={pending} />
        </Field>
        <Field label="Correo" required htmlFor="email" error={state.fieldErrors?.email} hint="El estudiante iniciará sesión con este correo">
          <Input id="email" name="email" type="email" icon="envelope-simple" disabled={pending} />
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
          <Select
            id="level"
            value={level}
            options={levelOptions}
            onChange={(e) => setLevel(e.target.value as AcademicLevel)}
            disabled={pending}
          />
        </Field>
      </div>

      <div>
        <Button type="submit" variant="primary" icon="user-plus" loading={pending} disabled={pending}>
          Crear estudiante
        </Button>
      </div>
    </form>
  );
}
