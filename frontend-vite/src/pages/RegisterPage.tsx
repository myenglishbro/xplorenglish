import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { Alert } from "@/components/ui/feedback/Alert";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Select } from "@/components/ui/forms/Select";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { ROLE_HOME_PATH } from "@/auth/roles";
import { useRegisterStudent, type RegisterFieldErrors } from "@/features/auth/hooks";

/**
 * Autorregistro público de estudiantes. Coexiste con Admin -> Estudiantes -> Nuevo estudiante
 * (CreateStudentForm, sin cambios): ese flujo sigue siendo el único que genera contraseñas
 * temporales y usa la Edge Function admin-create-student. Acá el propio estudiante define su
 * contraseña real desde el primer momento -- signUp() del lado del cliente, nunca
 * auth.admin.createUser() (eso requiere service_role, prohibido en el navegador).
 *
 * El proyecto tiene "Confirm email" deshabilitado en Supabase Auth: signUp() devuelve sesión de
 * una vez (sin correo de confirmación de por medio), así que el flujo es síncrono de punta a
 * punta -- crear cuenta -> AuthProvider completa el profile (ver completeSelfRegistrationIfPending)
 * -> redirige a /student. No existe pantalla de "revisa tu correo": si signUp() alguna vez
 * devolviera sin sesión (solo podría pasar si alguien reactiva la confirmación de correo sin
 * actualizar este flujo), se trata como error, no como un paso normal.
 *
 * Los programas se listan con la sesión anon (policy programs_select_anon, 0023) porque este
 * formulario se completa ANTES de que exista una sesión.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const { status, role, profileProvisionError } = useAuth();
  const mutation = useRegisterStudent();

  const [programs, setProgramsState] = React.useState<{ id: number; name: string }[]>([]);
  const [programsLoading, setProgramsLoading] = React.useState(true);
  const [programId, setProgramId] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<RegisterFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [awaitingProfile, setAwaitingProfile] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    supabase
      .from("programs")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setProgramsState(data);
        setProgramsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (status === "authenticated" && role) {
      navigate(ROLE_HOME_PATH[role], { replace: true });
    }
  }, [status, role, navigate]);

  // complete_registration() falló (p. ej. DNI duplicado) -- AuthProvider ya dejó de intentarlo,
  // hay que salir del spinner y mostrar el error en vez de esperar para siempre.
  React.useEffect(() => {
    if (awaitingProfile && profileProvisionError) {
      setAwaitingProfile(false);
      setFormError(profileProvisionError);
    }
  }, [awaitingProfile, profileProvisionError]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;

    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await mutation.mutateAsync({
        first_name: String(formData.get("first_name") ?? ""),
        last_name: String(formData.get("last_name") ?? ""),
        dni: String(formData.get("dni") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirm_password") ?? ""),
        program_id: programId ? Number(programId) : (undefined as unknown as number),
      });

      if (!result.hasSession) {
        // No debería pasar con "Confirm email" deshabilitado (ver useRegisterStudent) -- si pasa,
        // es un error real, no un paso normal del flujo.
        setFormError("No pudimos iniciar tu sesión automáticamente. Intenta iniciar sesión con tu correo y contraseña.");
        return;
      }

      // AuthProvider ya recibió el SIGNED_IN y va a completar el profile solo (ver
      // completeSelfRegistrationIfPending); el efecto de arriba redirige en cuanto role resuelva.
      setAwaitingProfile(true);
    } catch (err) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        setFieldErrors((err as { fieldErrors: RegisterFieldErrors }).fieldErrors);
      } else if (err instanceof Error) {
        setFormError(err.message);
      }
    }
  }

  if (status === "loading" || awaitingProfile || (status === "authenticated" && role)) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7f8" }}>
        <Spinner size={28} label="Cargando…" />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7f8" }}>
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden lg:flex" style={{ background: "#0c2438", color: "#ffffff" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -220,
              left: -180,
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(17,138,178,.18) 0%, rgba(17,138,178,0) 68%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -200,
              bottom: -260,
              width: 600,
              height: 600,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(244,162,97,.09) 0%, rgba(244,162,97,0) 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="relative flex w-full flex-col justify-between px-12 py-10 xl:px-16 xl:py-12">
            <div>
              <Logo height={36} />
            </div>
            <div style={{ maxWidth: 570, paddingBottom: 20 }}>
              <span
                style={{
                  display: "inline-block",
                  font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--xp-cyan)",
                }}
              >
                X-plore English
              </span>
              <h2
                style={{
                  margin: "18px 0 0",
                  maxWidth: 540,
                  font: "var(--weight-extrabold) clamp(38px,4vw,58px)/1.06 var(--font-display)",
                  letterSpacing: "-.04em",
                  color: "#ffffff",
                }}
              >
                Empieza tu camino,
                <br />
                hoy mismo.
              </h2>
              <p
                style={{
                  margin: "22px 0 0",
                  maxWidth: 500,
                  font: "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                  color: "rgba(255,255,255,.66)",
                }}
              >
                Crea tu cuenta de estudiante y accede a tus clases, materiales y recursos desde tu
                plataforma X-plore English.
              </p>
            </div>
            <div style={{ paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.10)" }}>
              <p style={{ margin: 0, font: "var(--weight-semibold) var(--text-body-sm-size)/1.5 var(--font-body)", color: "rgba(255,255,255,.72)" }}>
                English for the real world.
              </p>
            </div>
          </div>
        </section>

        <section
          className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12"
          style={{ background: "linear-gradient(180deg, #fafbfb 0%, #f4f6f7 100%)" }}
        >
          <div style={{ width: "100%", maxWidth: 560 }}>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
                ←
              </span>
              Volver a inicio de sesión
            </button>

            <div className="mb-9 lg:hidden">
              <Logo height={36} />
            </div>

            <Card
              style={{
                width: "100%",
                borderRadius: 22,
                padding: 0,
                overflow: "hidden",
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,.07)",
                boxShadow: "0 24px 70px rgba(15,23,42,.08), 0 4px 14px rgba(15,23,42,.04)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  height: 4,
                  background: "linear-gradient(90deg, var(--xp-cyan) 0%, var(--xp-cyan) 72%, var(--xp-orange) 72%, var(--xp-orange) 100%)",
                }}
              />

              <div style={{ padding: "38px 36px 36px" }}>
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                      textTransform: "uppercase",
                      letterSpacing: ".11em",
                      color: "var(--cyan-700)",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 20, height: 1, background: "var(--cyan-700)" }} />
                    Crear cuenta
                  </span>

                  <h1
                    style={{
                      margin: "13px 0 0",
                      font: "var(--weight-bold) clamp(26px,4vw,32px)/1.12 var(--font-display)",
                      letterSpacing: "-.025em",
                      color: "var(--text-heading)",
                    }}
                  >
                    Regístrate como estudiante
                  </h1>

                  <p style={{ margin: "10px 0 0", font: "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)", color: "var(--text-muted)" }}>
                    Completa tus datos para crear tu cuenta de acceso.
                  </p>
                </div>

                {formError && (
                  <div style={{ marginTop: 20 }}>
                    <Alert tone="danger">{formError}</Alert>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: 28 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
                    <Field label="Nombres" required htmlFor="first_name" error={fieldErrors.first_name}>
                      <Input id="first_name" name="first_name" disabled={mutation.isPending} />
                    </Field>
                    <Field label="Apellidos" required htmlFor="last_name" error={fieldErrors.last_name}>
                      <Input id="last_name" name="last_name" disabled={mutation.isPending} />
                    </Field>
                    <Field label="DNI/ID" required htmlFor="dni" error={fieldErrors.dni}>
                      <Input id="dni" name="dni" disabled={mutation.isPending} />
                    </Field>
                    <Field label="Teléfono" required htmlFor="phone" error={fieldErrors.phone}>
                      <Input id="phone" name="phone" type="tel" disabled={mutation.isPending} />
                    </Field>
                  </div>

                  <Field label="Correo electrónico" required htmlFor="email" error={fieldErrors.email}>
                    <Input id="email" name="email" type="email" icon="envelope-simple" autoComplete="email" disabled={mutation.isPending} />
                  </Field>

                  <Field label="Programa" required htmlFor="program_id" error={fieldErrors.program_id}>
                    <Select
                      id="program_id"
                      value={programId}
                      options={programs.map((p) => ({ value: String(p.id), label: p.name }))}
                      placeholder={programsLoading ? "Cargando…" : "Selecciona un programa"}
                      onChange={(e) => setProgramId(e.target.value)}
                      disabled={mutation.isPending || programsLoading}
                    />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
                    <Field label="Contraseña" required htmlFor="password" error={fieldErrors.password} hint="Mínimo 6 caracteres">
                      <Input id="password" name="password" type="password" icon="lock-key" autoComplete="new-password" disabled={mutation.isPending} />
                    </Field>
                    <Field label="Confirma tu contraseña" required htmlFor="confirm_password" error={fieldErrors.confirmPassword}>
                      <Input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        icon="lock-key"
                        autoComplete="new-password"
                        disabled={mutation.isPending}
                      />
                    </Field>
                  </div>

                  <Button type="submit" variant="primary" fullWidth loading={mutation.isPending} disabled={mutation.isPending} style={{ marginTop: 4, minHeight: 48 }}>
                    Crear cuenta
                  </Button>
                </form>

                <div style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
                  <p style={{ margin: 0, font: "var(--weight-regular) var(--text-caption-size)/1.55 var(--font-body)", color: "var(--text-muted)" }}>
                    ¿Ya tienes una cuenta? <Link to="/login" style={{ color: "var(--cyan-700)", fontWeight: 600 }}>Inicia sesión</Link>
                  </p>
                </div>
              </div>
            </Card>

            <p style={{ margin: "22px 0 0", textAlign: "center", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--neutral-500)" }}>
              © {new Date().getFullYear()} X-plore English
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
