import React from "react";

import { useNavigate, useLocation, Link } from "react-router-dom";

import { Logo } from "@/components/ui/core/Logo";
import { Icon } from "@/components/ui/core/Icon";
import { Alert } from "@/components/ui/feedback/Alert";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { ROLE_HOME_PATH } from "@/auth/roles";

/**
 * Solo presentación: animaciones de entrada, orbes flotantes, panel de marca con chips, botón de
 * "volver" y de mostrar contraseña. Los estados interactivos viven en clases CSS (no en
 * onMouseEnter/Leave) y `prefers-reduced-motion` desactiva todo movimiento.
 */
const STYLES = `
  .xp-login-brand { background: #0c2438; color: #fff; }
  .xp-login-grid {
    position: absolute; inset: 0; pointer-events: none; opacity: .5;
    background-image: radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%);
    mask-image: radial-gradient(ellipse at 30% 40%, #000 20%, transparent 75%);
  }
  .xp-login-orb { position: absolute; border-radius: 50%; pointer-events: none; }
  .xp-login-orb-a { top: -220px; left: -180px; width: 520px; height: 520px; background: radial-gradient(circle, rgba(17,138,178,.26) 0%, rgba(17,138,178,0) 68%); animation: xp-login-float 14s ease-in-out infinite; }
  .xp-login-orb-b { right: -200px; bottom: -260px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(244,162,97,.14) 0%, rgba(244,162,97,0) 70%); animation: xp-login-float 18s ease-in-out infinite reverse; }

  .xp-login-stage { position: relative; display: flex; justify-content: center; align-items: flex-end; margin-top: 18px; height: clamp(230px, 38vh, 340px); }
  .xp-login-ring {
    position: absolute; left: 50%; top: 52%; width: min(430px, 96%); aspect-ratio: 1; border-radius: 50%;
    border: 1.5px dashed rgba(255,255,255,.18); transform: translate(-50%, -50%); animation: xp-login-orbit 80s linear infinite;
  }
  .xp-login-ring::after {
    content: ""; position: absolute; top: -6px; left: 50%; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%;
    background: var(--xp-orange); box-shadow: 0 0 16px rgba(244,162,97,.9);
  }
  .xp-login-ring-inner { width: min(300px, 68%); border-style: solid; border-color: rgba(17,138,178,.28); animation-duration: 55s; animation-direction: reverse; }
  .xp-login-ring-inner::after { background: var(--xp-cyan); box-shadow: 0 0 14px rgba(17,138,178,.9); }
  .xp-login-glow { position: absolute; left: 50%; top: 55%; width: 380px; height: 380px; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, rgba(244,162,97,.22) 0%, rgba(17,138,178,.12) 45%, transparent 70%); pointer-events: none; }
  .xp-login-mascot {
    position: relative; height: 100%; width: auto; transform-origin: 50% 100%;
    filter: drop-shadow(0 18px 22px rgba(0,0,0,.38)); animation: xp-login-bob 4.2s ease-in-out infinite;
  }
  .xp-login-bubble {
    position: absolute; top: 4%; right: calc(50% + 46px); padding: 8px 18px; border-radius: 20px 20px 4px 20px;
    background: #fff; color: #0c2438; box-shadow: 0 10px 28px rgba(0,0,0,.28);
    font: var(--weight-extrabold) 20px/1.1 var(--font-display); letter-spacing: -.01em;
    transform-origin: 100% 100%; animation: xp-login-pop .55s cubic-bezier(.34,1.56,.64,1) 1s both;
  }
  .xp-login-mhero { display: flex; align-items: center; gap: 14px; margin-top: 18px; padding: 14px 16px; border-radius: 18px; background: #0c2438; color: #fff; overflow: hidden; }
  .xp-login-mhero img { height: 96px; width: auto; flex: 0 0 auto; margin: -6px 0 -14px; transform-origin: 50% 100%; animation: xp-login-bob 4.2s ease-in-out infinite; }

  .xp-login-rise { animation: xp-login-up .65s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--d, 0) * 90ms); }

  .xp-login-back {
    display: inline-flex; align-items: center; gap: 8px; margin-bottom: 24px; padding: 6px 4px; border: 0; background: transparent;
    color: var(--text-muted); cursor: pointer; font: var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body);
    transition: color .2s ease;
  }
  .xp-login-back:hover { color: var(--text-heading); }
  .xp-login-back .xp-login-back-arrow { display: inline-flex; transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
  .xp-login-back:hover .xp-login-back-arrow { transform: translateX(-4px); }

  .xp-login-card { animation: xp-login-up .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: .08s; }

  .xp-login-eye {
    position: absolute; top: 50%; right: 8px; transform: translateY(-50%); width: 34px; height: 34px;
    display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px;
    background: transparent; color: var(--text-subtle); cursor: pointer; transition: background .2s ease, color .2s ease;
  }
  .xp-login-eye:hover:not(:disabled) { background: var(--surface-hover); color: var(--text-heading); }
  .xp-login-eye:focus-visible { outline: 2px solid var(--xp-cyan); outline-offset: 1px; }

  .xp-login-shake { animation: xp-login-shake .45s cubic-bezier(.36,.07,.19,.97) both; }
  .xp-login-link { color: var(--cyan-700); text-decoration: none; transition: color .2s ease; }
  .xp-login-link:hover { color: var(--cyan-600); text-decoration: none; }
  .xp-login-link span { display: inline-block; transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
  .xp-login-link:hover span { transform: translateX(4px); }

  @keyframes xp-login-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes xp-login-orbit { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
  @keyframes xp-login-bob { 0%, 100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-10px) rotate(1.5deg); } }
  @keyframes xp-login-pop { from { opacity: 0; transform: scale(.3) rotate(-8deg); } to { opacity: 1; transform: none; } }
  @keyframes xp-login-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(24px, -18px); } }
  @keyframes xp-login-shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(3px); } 30%, 50%, 70% { transform: translateX(-5px); } 40%, 60% { transform: translateX(5px); } }

  @media (prefers-reduced-motion: reduce) {
    .xp-login-rise, .xp-login-card, .xp-login-orb, .xp-login-shake, .xp-login-ring, .xp-login-mascot, .xp-login-bubble, .xp-login-mhero img { animation: none !important; }
    .xp-login-back-arrow, .xp-login-link span { transition: none !important; }
    .xp-login-back:hover .xp-login-back-arrow, .xp-login-link:hover span { transform: none; }
  }
`;

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
  // Solo UI: mostrar/ocultar contraseña, aviso de Bloq Mayús y reinicio de la animación del error.
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  const [errorTick, setErrorTick] = React.useState(0);

  const { status, role, profileMissing, profileProvisionError } = useAuth();

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
      setErrorTick((t) => t + 1);

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
      <style>{STYLES}</style>

      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        {/* ============================================================
            BRAND / VISUAL PANEL
        ============================================================ */}
        <section className="xp-login-brand relative hidden overflow-hidden lg:flex">
          <div aria-hidden="true" className="xp-login-grid" />
          <div aria-hidden="true" className="xp-login-orb xp-login-orb-a" />
          <div aria-hidden="true" className="xp-login-orb xp-login-orb-b" />

          <div className="relative flex w-full flex-col justify-between px-12 py-10 xl:px-16 xl:py-12">
            {/* Brand */}
            <div className="xp-login-rise" style={{ ["--d" as string]: 0 }}>
              <Logo height={36} />
            </div>

            {/* Main message + mascota */}
            <div style={{ maxWidth: 560 }}>
              <h2
                className="xp-login-rise"
                style={{
                  ["--d" as string]: 1,
                  margin: 0,
                  font: "var(--weight-extrabold) clamp(48px,5.4vw,78px)/.98 var(--font-display)",
                  letterSpacing: "-.045em",
                  color: "#ffffff",
                }}
              >
                Hi,
                <br />
                <span style={{ color: "var(--xp-orange)" }}>Explorers!</span>
              </h2>

              <p
                className="xp-login-rise"
                style={{
                  ["--d" as string]: 2,
                  margin: "20px 0 0",
                  maxWidth: 470,
                  font: "var(--weight-semibold) clamp(18px,1.7vw,23px)/1.35 var(--font-display)",
                  letterSpacing: "-.01em",
                  color: "#ffffff",
                }}
              >
                ¿Listos para hablar el <span style={{ color: "var(--xp-cyan)" }}>idioma del mundo</span>?
              </p>

              <p
                className="xp-login-rise"
                style={{
                  ["--d" as string]: 3,
                  margin: "12px 0 0",
                  maxWidth: 440,
                  font: "var(--weight-regular) var(--text-body-size)/1.65 var(--font-body)",
                  color: "rgba(255,255,255,.64)",
                }}
              >
                Entra a tu salón, practica con tus actividades y sigue tu ruta de aprendizaje.
              </p>

              <div className="xp-login-stage xp-login-rise" style={{ ["--d" as string]: 4 }}>
                <div aria-hidden="true" className="xp-login-glow" />
                <div aria-hidden="true" className="xp-login-ring" />
                <div aria-hidden="true" className="xp-login-ring xp-login-ring-inner" />
                <span aria-hidden="true" className="xp-login-bubble">Hi!</span>
                <img src="/assets/mascota.png" alt="Mascota de X-plore English saludando" width={248} height={318} decoding="async" className="xp-login-mascot" />
              </div>
            </div>

            {/* Footer quote */}
            <div className="xp-login-rise" style={{ ["--d" as string]: 8, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.10)" }}>
              <p
                style={{
                  margin: 0,
                  font: "var(--weight-semibold) var(--text-body-sm-size)/1.5 var(--font-body)",
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
          style={{ background: "linear-gradient(180deg, #fafbfb 0%, #f4f6f7 100%)" }}
        >
          <div style={{ width: "100%", maxWidth: 470 }}>
            {/* Regresar al inicio */}
            <button type="button" className="xp-login-back xp-login-rise" onClick={() => navigate("/")}>
              <span aria-hidden="true" className="xp-login-back-arrow">
                <Icon name="arrow-left" weight="bold" size={16} color="currentColor" />
              </span>
              Volver al inicio
            </button>

            {/* Mobile logo */}
            <div className="mb-8 lg:hidden">
              <Logo height={36} />
              <div className="xp-login-mhero">
                <img src="/assets/mascota.png" alt="Mascota de X-plore English saludando" width={248} height={318} decoding="async" />
                <div>
                  <div style={{ font: "var(--weight-extrabold) 22px/1.1 var(--font-display)", letterSpacing: "-.02em" }}>
                    Hi, <span style={{ color: "var(--xp-orange)" }}>Explorers!</span>
                  </div>
                  <div style={{ marginTop: 4, font: "var(--weight-medium) 14px/1.4 var(--font-body)", color: "rgba(255,255,255,.78)" }}>
                    ¿Listos para hablar el idioma del mundo?
                  </div>
                </div>
              </div>
            </div>

            <div
              className="xp-login-card"
              style={{
                width: "100%",
                borderRadius: 22,
                overflow: "hidden",
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,.07)",
                boxShadow: "0 24px 70px rgba(15,23,42,.08), 0 4px 14px rgba(15,23,42,.04)",
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

              <div style={{ padding: "38px 36px 36px" }}>
                {/* Header */}
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
                    ¡Qué bueno verte de nuevo!
                  </span>

                  <h1
                    style={{
                      margin: "13px 0 0",
                      font: "var(--weight-bold) clamp(30px,4vw,38px)/1.12 var(--font-display)",
                      letterSpacing: "-.025em",
                      color: "var(--text-heading)",
                    }}
                  >
                    Entra y sigue explorando
                  </h1>

                  <p
                    style={{
                      margin: "10px 0 0",
                      font: "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Usa tu correo y contraseña para ver tus clases, actividades y avances.
                  </p>
                </div>

                {/* Alerts */}
                <div
                  style={{
                    marginTop: error || profileMissing ? 24 : 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {error && (
                    <div key={errorTick} className="xp-login-shake">
                      <Alert tone="danger">{error}</Alert>
                    </div>
                  )}

                  {profileMissing && (
                    <Alert tone="danger">
                      {/* profileProvisionError es más específico (p. ej. DNI duplicado tras
                      confirmar el correo de un autorregistro) que el mensaje genérico de
                      "sin perfil" -- ver AuthProvider.completeSelfRegistrationIfPending. */}
                      {profileProvisionError ?? "Tu cuenta no tiene un perfil asociado. Contacta a un administrador."}
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
                  <Field label="Correo electrónico" required htmlFor="email">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      icon="envelope-simple"
                      placeholder="tucorreo@ejemplo.com"
                      autoComplete="email"
                      disabled={pending}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Contraseña"
                    required
                    htmlFor="password"
                    hint={capsLock ? "Tienes el bloqueo de mayúsculas activado." : undefined}
                  >
                    {/* onBlur va en el contenedor: pasárselo al Input pisaría su manejo interno del foco. */}
                    <div style={{ position: "relative" }} onBlur={() => setCapsLock(false)}>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        icon="lock-key"
                        placeholder="Tu contraseña"
                        autoComplete="current-password"
                        disabled={pending}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                        style={{ paddingRight: 46 }}
                      />
                      <button
                        type="button"
                        className="xp-login-eye"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={pending}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={showPassword}
                      >
                        <Icon name={showPassword ? "eye-slash" : "eye"} weight="regular" size={18} color="currentColor" />
                      </button>
                    </div>
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
                    Entrar a mi espacio
                  </Button>

                  <Link
                    to="/register"
                    className="xp-login-link"
                    style={{
                      display: "block",
                      textAlign: "center",
                      font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)",
                    }}
                  >
                    ¿Primera vez por aquí? Crea tu cuenta <span aria-hidden="true">→</span>
                  </Link>
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
                      font: "var(--weight-regular) var(--text-caption-size)/1.55 var(--font-body)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ¿Algo no te deja entrar?
                    <br />
                    Escríbenos y el equipo de X-plore English te ayuda.
                  </p>
                </div>
              </div>
            </div>

            {/* Outside footer */}
            <p
              style={{
                margin: "22px 0 0",
                textAlign: "center",
                font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
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
