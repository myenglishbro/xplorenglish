import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { Alert } from "@/components/ui/feedback/Alert";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { ROLE_HOME_PATH } from "@/auth/roles";

/**
 * Portado conceptual de src/app/login/{page.tsx,LoginForm.tsx} (Next) -- mismo layout/Card, pero
 * signInWithPassword se llama directo desde el cliente (no hay Server Action). Tras un login
 * exitoso, AuthProvider recibe el SIGNED_IN vía onAuthStateChange y carga el profile una sola vez;
 * este componente solo espera a que `status`/`role` se resuelvan para redirigir -- no duplica esa
 * lógica.
 */
export function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { status, role, profileMissing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  React.useEffect(() => {
    if (status !== "authenticated" || !role) return;
    navigate(from ?? ROLE_HOME_PATH[role], { replace: true });
  }, [status, role, from, navigate]);

  // Evita el flash del formulario mientras AuthProvider todavía resuelve una sesión persistida
  // (recarga con sesión válida) o justo antes de que el efecto de arriba redirija.
  if (status === "loading" || (status === "authenticated" && role)) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-page)" }}>
        <Spinner size={28} label="Cargando…" />
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : signInError.message);
      setPending(false);
      return;
    }
    // No setPending(false) aquí: el efecto de arriba redirige en cuanto AuthProvider resuelve el
    // profile; dejar el botón en loading hasta ese momento evita un "flash" de formulario habilitado.
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-page)",
        padding: "var(--space-6)",
      }}
    >
      <Card accent="accent" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Logo height={40} />
          <div>
            <span className="xp-eyebrow">{"// BIENVENIDO DE VUELTA"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Inicia sesión
            </h1>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}
          {profileMissing && <Alert tone="danger">Tu cuenta no tiene un perfil asociado. Contacta a un administrador.</Alert>}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Field label="Correo" required htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                icon="envelope-simple"
                autoComplete="email"
                disabled={pending}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Contraseña" required htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                icon="lock-key"
                autoComplete="current-password"
                disabled={pending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
              Iniciar sesión
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
