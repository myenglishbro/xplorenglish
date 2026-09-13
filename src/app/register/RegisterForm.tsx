"use client";

import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { registerAction, type RegisterActionState } from "./actions";

export function RegisterForm() {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<RegisterActionState>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // evita doble submit mientras la operación está pendiente
    setPending(true);
    setState({});
    const formData = new FormData(event.currentTarget);
    try {
      const result = await registerAction(formData);
      setState(result ?? {});
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Nombre" required htmlFor="first_name" error={state.fieldErrors?.first_name}>
        <Input id="first_name" name="first_name" autoComplete="given-name" disabled={pending} />
      </Field>

      <Field label="Apellido" required htmlFor="last_name" error={state.fieldErrors?.last_name}>
        <Input id="last_name" name="last_name" autoComplete="family-name" disabled={pending} />
      </Field>

      <Field label="DNI" required htmlFor="dni" error={state.fieldErrors?.dni}>
        <Input id="dni" name="dni" icon="identification-card" autoComplete="off" disabled={pending} />
      </Field>

      <Field label="Teléfono" required htmlFor="phone" error={state.fieldErrors?.phone}>
        <Input id="phone" name="phone" type="tel" icon="phone" autoComplete="tel" disabled={pending} />
      </Field>

      <Field label="Correo" required htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" icon="envelope-simple" autoComplete="email" disabled={pending} />
      </Field>

      <Field label="Contraseña" required htmlFor="password" hint="Mínimo 6 caracteres" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" icon="lock-key" autoComplete="new-password" disabled={pending} />
      </Field>

      <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
        Crear cuenta
      </Button>
    </form>
  );
}
