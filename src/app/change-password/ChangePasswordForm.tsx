"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { logoutAction } from "@/lib/auth/actions";
import { markPasswordChangedAction } from "./actions";

type Status = "idle" | "pending" | "post-update-error";

export function ChangePasswordForm() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | undefined>();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setStatus("pending");
    setError(undefined);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setStatus("idle");
      setError("No pudimos guardar tu contraseña. Inténtalo de nuevo en unos minutos.");
      return;
    }

    const result = await markPasswordChangedAction();

    if (result.error) {
      // El password ya se guardó (el paso anterior tuvo éxito); esto solo significa que el
      // servidor no pudo confirmar el cambio con la sesión actual. No se oculta ni se navega
      // como si nada -- se le pide iniciar sesión de nuevo, un camino que sí pasa por el flujo
      // normal de cookies de /login.
      setStatus("post-update-error");
      setError(result.error);
      return;
    }

    // Navegación dura (no router.push): fuerza una request nueva al servidor con las cookies
    // ya escritas por el SDK, en vez de depender del router/caché de cliente de Next para una
    // transición que depende de que el servidor reconozca la sesión recién establecida.
    window.location.href = "/";
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAction();
  }

  if (status === "post-update-error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Alert tone="warning" title="Tu contraseña se guardó, pero algo falló después">
          {error} Inicia sesión de nuevo con tu correo y la contraseña que acabas de crear.
        </Alert>
        <Button type="button" variant="secondary" onClick={handleLogout} loading={loggingOut} disabled={loggingOut}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  const pending = status === "pending";

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
        Debes reemplazar la contraseña temporal que te dieron por una que solo tú conozcas antes de continuar.
      </p>

      <Field label="Nueva contraseña" required htmlFor="password" hint="Mínimo 6 caracteres">
        <Input
          id="password"
          type="password"
          icon="lock-key"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Field label="Confirma tu contraseña" required htmlFor="confirm_password">
        <Input
          id="confirm_password"
          type="password"
          icon="lock-key"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
        Cambiar contraseña y entrar
      </Button>

      <Button type="button" variant="ghost" fullWidth onClick={handleLogout} loading={loggingOut} disabled={pending || loggingOut}>
        Cerrar sesión
      </Button>
    </form>
  );
}
