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

  const from = (
    location.state as { from?: { pathname?: string } } | null
  )?.from?.pathname;

  React.useEffect(() => {
    if (status !== "authenticated" || !role) return;

    navigate(from ?? ROLE_HOME_PATH[role], { replace: true });
  }, [status, role, from, navigate]);

  // Evita el flash del formulario mientras AuthProvider todavía resuelve una sesión persistida
  // (recarga con sesión válida) o justo antes de que el efecto de arriba redirija.
  if (status === "loading" || (status === "authenticated" && role)) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7f8",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Spinner size={28} label="Cargando…" />

          <span
            style={{
              font:
                "var(--weight-medium) var(--text-body-sm-size)/1.4 var(--font-body)",
              color: "var(--text-muted)",
            }}
          >
            Preparando tu espacio
          </span>
        </div>
      </main>
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) return;

    setPending(true);
    setError(null);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : signInError.message,
      );

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
        background: "#f5f7f8",
      }}
    >
      <div
        className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]"
      >
        {/* ============================================================
            BRAND / VISUAL PANEL
        ============================================================ */}
        <section
          className="relative hidden overflow-hidden lg:flex"
          style={{
            background: "#0c2438",
            color: "#ffffff",
          }}
        >
          {/* Soft decorative glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -220,
              left: -180,
              width: 520,
              height: 520,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(17,138,178,.18) 0%, rgba(17,138,178,0) 68%)",
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
              background:
                "radial-gradient(circle, rgba(244,162,97,.09) 0%, rgba(244,162,97,0) 70%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="relative flex w-full flex-col justify-between px-12 py-10 xl:px-16 xl:py-12"
          >
            {/* Brand */}
            <div>
              <Logo height={36} />
            </div>

            {/* Main message */}
            <div
              style={{
                maxWidth: 570,
                paddingBottom: 20,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  font:
                    "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
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
                  font:
                    "var(--weight-extrabold) clamp(38px,4vw,58px)/1.06 var(--font-display)",
                  letterSpacing: "-.04em",
                  color: "#ffffff",
                }}
              >
                Tu aprendizaje,
                <br />
                en un solo lugar.
              </h2>

              <p
                style={{
                  margin: "22px 0 0",
                  maxWidth: 500,
                  font:
                    "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                  color: "rgba(255,255,255,.66)",
                }}
              >
                Accede a tus clases, materiales, salones y recursos desde
                tu plataforma X-plore English.
              </p>

              <div
                className="mt-9 grid gap-3 sm:grid-cols-2"
                style={{
                  maxWidth: 500,
                }}
              >
                {[
                  "Clases y sesiones",
                  "Material académico",
                  "Seguimiento del progreso",
                  "Experiencia personalizada",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 7,
                        height: 7,
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: "var(--xp-cyan)",
                      }}
                    />

                    <span
                      style={{
                        font:
                          "var(--weight-medium) var(--text-body-sm-size)/1.4 var(--font-body)",
                        color: "rgba(255,255,255,.82)",
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer quote */}
            <div
              style={{
                paddingTop: 22,
                borderTop: "1px solid rgba(255,255,255,.10)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  font:
                    "var(--weight-semibold) var(--text-body-sm-size)/1.5 var(--font-body)",
                  color: "rgba(255,255,255,.72)",
                }}
              >
                English for the real world.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================
            LOGIN FORM
        ============================================================ */}
        <section
          className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12"
          style={{
            background:
              "linear-gradient(180deg, #fafbfb 0%, #f4f6f7 100%)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 470,
            }}
          >
            {/* Regresar al inicio */}
<button
  type="button"
  onClick={() => navigate("/")}
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
    font:
      "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)",
    transition: "color .2s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = "var(--text-heading)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = "var(--text-muted)";
  }}
>
  <span
    aria-hidden="true"
    style={{
      fontSize: 18,
      lineHeight: 1,
    }}
  >
    ←
  </span>

  Volver al inicio
</button>
            {/* Mobile logo */}
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
                boxShadow:
                  "0 24px 70px rgba(15,23,42,.08), 0 4px 14px rgba(15,23,42,.04)",
              }}
            >
              {/* Small top accent */}
              <div
                aria-hidden="true"
                style={{
                  height: 4,
                  background:
                    "linear-gradient(90deg, var(--xp-cyan) 0%, var(--xp-cyan) 72%, var(--xp-orange) 72%, var(--xp-orange) 100%)",
                }}
              />

              <div
                style={{
                  padding: "38px 36px 36px",
                }}
              >
                {/* Header */}
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      font:
                        "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                      textTransform: "uppercase",
                      letterSpacing: ".11em",
                      color: "var(--cyan-700)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 20,
                        height: 1,
                        background: "var(--cyan-700)",
                      }}
                    />

                    Bienvenido de vuelta
                  </span>

                  <h1
                    style={{
                      margin: "13px 0 0",
                      font:
                        "var(--weight-bold) clamp(30px,4vw,38px)/1.12 var(--font-display)",
                      letterSpacing: "-.025em",
                      color: "var(--text-heading)",
                    }}
                  >
                    Inicia sesión
                  </h1>

                  <p
                    style={{
                      margin: "10px 0 0",
                      font:
                        "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Ingresa con tus credenciales para acceder a tu espacio
                    académico.
                  </p>
                </div>

                {/* Alerts */}
                <div
                  style={{
                    marginTop:
                      error || profileMissing ? 24 : 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {error && (
                    <Alert tone="danger">
                      {error}
                    </Alert>
                  )}

                  {profileMissing && (
                    <Alert tone="danger">
                      Tu cuenta no tiene un perfil asociado. Contacta a un
                      administrador.
                    </Alert>
                  )}
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    marginTop: 28,
                  }}
                >
                  <Field
                    label="Correo electrónico"
                    required
                    htmlFor="email"
                  >
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      icon="envelope-simple"
                      autoComplete="email"
                      disabled={pending}
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                    />
                  </Field>

                  <Field
                    label="Contraseña"
                    required
                    htmlFor="password"
                  >
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      icon="lock-key"
                      autoComplete="current-password"
                      disabled={pending}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                    />
                  </Field>

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={pending}
                    disabled={pending}
                    style={{
                      marginTop: 4,
                      minHeight: 48,
                    }}
                  >
                    Iniciar sesión
                  </Button>
                </form>

                {/* Support copy */}
                <div
                  style={{
                    marginTop: 28,
                    paddingTop: 22,
                    borderTop: "1px solid var(--border-subtle)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      font:
                        "var(--weight-regular) var(--text-caption-size)/1.55 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ¿Tienes problemas para acceder?
                    <br />
                    Comunícate con el equipo de X-plore English.
                  </p>
                </div>
              </div>
            </Card>

            {/* Outside footer */}
            <p
              style={{
                margin: "22px 0 0",
                textAlign: "center",
                font:
                  "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
                color: "var(--neutral-500)",
              }}
            >
              © {new Date().getFullYear()} X-plore English
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}