"use client";

import React from "react";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { loginAction, type LoginActionState } from "./actions";

export function LoginForm() {
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<LoginActionState>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // evita doble submit mientras la operación está pendiente
    setPending(true);
    setState({});
    const formData = new FormData(event.currentTarget);
    try {
      const result = await loginAction(formData);
      setState(result ?? {});
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Correo" required htmlFor="email">
        <Input id="email" name="email" type="email" icon="envelope-simple" autoComplete="email" disabled={pending} />
      </Field>

      <Field label="Contraseña" required htmlFor="password">
        <Input id="password" name="password" type="password" icon="lock-key" autoComplete="current-password" disabled={pending} />
      </Field>

      <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
        Iniciar sesión
      </Button>
    </form>
  );
}
