"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { markInvitationAcceptedAction } from "./actions";

type Status = "checking" | "no-session" | "ready" | "pending" | "post-update-error";

export function SetPasswordForm() {
  const [status, setStatus] = React.useState<Status>("checking");
  const [error, setError] = React.useState<string | undefined>();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // getSession() espera internamente a que el SDK termine de inicializar, incluida la
    // detección automática de la sesión en el fragmento de la URL (#access_token=...) que
    // Supabase Auth agrega al redirigir desde el enlace de invitación -- no hace falta leer
    // el hash manualmente.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? "ready" : "no-session");
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
      setStatus("ready");
      setError("No pudimos guardar tu contraseña. Inténtalo de nuevo en unos minutos.");
      return;
    }

    const result = await markInvitationAcceptedAction();

    if (result.error) {
      // El password ya se guardó (el paso anterior tuvo éxito); esto solo significa que el
      // servidor no pudo confirmar la invitación con la sesión actual. No se oculta ni se
      // navega como si nada -- se le pide iniciar sesión de nuevo, un camino que sí pasa por
      // el flujo normal de cookies de /login.
      setStatus("post-update-error");
      setError(result.error);
      return;
    }

    // Navegación dura (no router.push): fuerza una request nueva al servidor con las cookies
    // ya escritas por el SDK, en vez de depender del router/caché de cliente de Next para una
    // transición que depende de que el servidor reconozca la sesión recién establecida.
    window.location.href = "/";
  }

  if (status === "checking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
        <Spinner size={26} label="Verificando tu enlace…" />
      </div>
    );
  }

  if (status === "no-session") {
    return (
      <Alert tone="danger" title="Este enlace ya no es válido">
        Puede haber expirado o ya fue usado. Pide a tu administrador que te reenvíe la invitación,
        o <Link href="/login">inicia sesión</Link> si ya configuraste tu acceso antes.
      </Alert>
    );
  }

  if (status === "post-update-error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Alert tone="warning" title="Tu contraseña se guardó, pero algo falló después">
          {error} Intenta <Link href="/login">iniciar sesión</Link> con tu correo y la contraseña que
          acabas de crear.
        </Alert>
      </div>
    );
  }

  const pending = status === "pending";

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && <Alert tone="danger">{error}</Alert>}

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
        Crear contraseña y entrar
      </Button>
    </form>
  );
}
