import React from "react";
import { useNavigate } from "react-router-dom";
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

type FormStatus = "idle" | "pending" | "post-update-error";

/**
 * Portado conceptual de src/app/change-password/{page.tsx,ChangePasswordForm.tsx} (Next) --
 * mismo guard/flujo/orden, sin cookies ni Server Action: supabase.auth.updateUser({password})
 * directo desde el cliente, y luego supabase.rpc("mark_password_changed") directo (mismo RPC,
 * SECURITY DEFINER, sin cambios -- ver 0014). Ruta top-level (fuera de /admin, /teacher,
 * /student): NUNCA se envuelve en <ProtectedRoute>, porque ProtectedRoute es quien redirige HACIA
 * acá cuando profile.must_change_password -- envolver esta página en ese mismo guard produciría
 * un loop.
 */
export function ChangePasswordPage() {
  const { status, profile, profileMissing, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [formStatus, setFormStatus] = React.useState<FormStatus>("idle");
  const [error, setError] = React.useState<string | undefined>();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Mismo hueco que documenta ProtectedRoute: status ya es "authenticated" pero el profile todavía
  // no llegó (round-trip aparte en AuthProvider) -- se trata como "cargando", nunca como
  // profileMissing/redirect prematuro.
  const stillResolvingProfile = status === "authenticated" && !profileMissing && !profile;

  React.useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login", { replace: true });
      return;
    }
    // Ya no hay nada que cambiar acá -- red de seguridad, no un paso obligatorio (mismo criterio
    // que el page.tsx de Next: si must_change_password es false, no hay motivo para estar acá).
    if (profile && !profile.must_change_password) {
      navigate(ROLE_HOME_PATH[profile.role], { replace: true });
    }
  }, [status, profile, navigate]);

  if (status === "loading" || stillResolvingProfile || status === "unauthenticated" || (profile && !profile.must_change_password)) {
    // El efecto de arriba ya está navegando en los dos últimos casos -- este spinner solo evita
    // el flash del formulario mientras tanto.
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-page)" }}>
        <Spinner size={28} label="Cargando…" />
      </main>
    );
  }

  if (profileMissing || !profile) {
    return (
      <main
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-5)", background: "var(--surface-page)" }}
      >
        <div style={{ maxWidth: 480 }}>
          <Alert tone="danger">
            Tu cuenta no tiene un perfil asociado. Contacta a un administrador para que lo cree -- esta aplicación nunca crea perfiles
            automáticamente.
          </Alert>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formStatus === "pending") return;

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setFormStatus("pending");
    setError(undefined);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setFormStatus("idle");
      setError("No pudimos guardar tu contraseña. Inténtalo de nuevo en unos minutos.");
      return;
    }

    // Solo se llama al RPC si el cambio de contraseña en Auth tuvo éxito -- nunca al revés.
    const { error: rpcError } = await supabase.rpc("mark_password_changed");
    if (rpcError) {
      // Comportamiento defensivo equivalente al Next legado: la contraseña YA cambió (el paso
      // anterior tuvo éxito), esto solo significa que no pudimos confirmar el cambio de estado.
      // Nunca se oculta, nunca se marca la bandera manualmente desde el frontend (no hay bypass) --
      // se pide cerrar sesión y volver a entrar con la contraseña nueva, un camino que sí vuelve a
      // resolver el profile desde cero.
      setFormStatus("post-update-error");
      setError(
        "Tu contraseña se guardó, pero no pudimos actualizar tu estado. Cierra sesión y vuelve a iniciar sesión con tu correo y la contraseña que acabas de crear."
      );
      return;
    }

    // refreshProfile() vuelve a pedir la fila completa de profiles -- ya viene con
    // must_change_password=false (la RPC la actualizó). El efecto de arriba se encarga de navegar
    // en cuanto el context se actualice; no se duplica esa navegación acá.
    await refreshProfile();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (formStatus === "post-update-error") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-page)", padding: "var(--space-6)" }}>
        <Card accent="accent" style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Logo height={40} />
            <Alert tone="warning" title="Tu contraseña se guardó, pero algo falló después">
              {error}
            </Alert>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Ir a iniciar sesión
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const pending = formStatus === "pending";

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
            <span className="xp-eyebrow">{"// ÚLTIMO PASO"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Cambia tu contraseña temporal
            </h1>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
              Debes reemplazar la contraseña temporal que te dieron por una que solo tú conozcas antes de continuar.
            </p>

            <Field label="Nueva contraseña" required htmlFor="password" hint="Mínimo 6 caracteres">
              <Input
                id="password"
                name="password"
                type="password"
                icon="lock-key"
                autoComplete="new-password"
                disabled={pending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Field label="Confirma tu contraseña" required htmlFor="confirm_password">
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                icon="lock-key"
                autoComplete="new-password"
                disabled={pending}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" variant="primary" fullWidth loading={pending} disabled={pending}>
              Cambiar contraseña y entrar
            </Button>

            <Button type="button" variant="ghost" fullWidth onClick={handleLogout} disabled={pending}>
              Cerrar sesión
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
