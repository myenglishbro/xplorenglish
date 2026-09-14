import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";
import { Card } from "@/components/ui/surfaces/Card";
import { LandingNavbar } from "@/components/public/LandingNavbar";
import { LandingFooter } from "@/components/public/LandingFooter";

const PROGRAMS = [
  {
    icon: "baby",
    title: "Kids",
    description: "Inglés para niños mediante actividades dinámicas y aprendizaje progresivo.",
  },
  {
    icon: "student",
    title: "Teens",
    description: "Desarrollo comunicativo y académico para adolescentes.",
  },
  {
    icon: "briefcase",
    title: "Adults",
    description: "Inglés práctico orientado a comunicación, estudios y desarrollo profesional.",
  },
];

const VALUE_PROPS = [
  { icon: "chalkboard-teacher", label: "Clases dinámicas" },
  { icon: "chart-line-up", label: "Seguimiento del aprendizaje" },
  { icon: "graduation-cap", label: "Docentes especializados" },
  { icon: "laptop", label: "Acceso a plataforma educativa" },
  { icon: "books", label: "Materiales y recursos" },
  { icon: "calendar-check", label: "Organización de clases y contenidos" },
];

const STEPS = [
  { number: "1", title: "Elige tu programa", icon: "magnifying-glass" },
  { number: "2", title: "Inscríbete", icon: "clipboard-text" },
  { number: "3", title: "Participa en tus clases", icon: "users-three" },
  { number: "4", title: "Continúa aprendiendo desde la plataforma", icon: "laptop" },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <span className="xp-eyebrow">{children}</span>;
}

/**
 * Landing comercial pública -- vive en "/", sin sesión. Todo el contenido es 100% estático
 * (sin Supabase); los únicos puntos de contacto con la app real son los CTAs hacia /login (mismo
 * comportamiento de redirección por rol que ya tiene LoginPage/ProtectedRoute, sin duplicarlo acá).
 */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--surface-page)" }}>
      <LandingNavbar />

      {/* HERO */}
      <section id="inicio" className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <SectionEyebrow>{"// XPLORE ENGLISH"}</SectionEyebrow>
          <h1
            className="mt-3"
            style={{
              font: "var(--weight-extrabold) clamp(32px, 5.5vw, var(--text-display-size))/1.1 var(--font-display)",
              letterSpacing: "var(--text-display-ls)",
              color: "var(--text-heading)",
            }}
          >
            Aprende inglés. Explora nuevas oportunidades.
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl"
            style={{ font: "var(--weight-regular) var(--text-body-lg-size)/var(--text-body-lg-lh) var(--font-body)", color: "var(--text-muted)" }}
          >
            Programas de inglés para niños, adolescentes y adultos, con clases dinámicas, acompañamiento docente y una plataforma educativa para continuar
            aprendiendo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#programas" style={{ width: "100%" }} className="sm:w-auto">
              <Button variant="secondary" size="lg" fullWidth icon="book-open">
                Conoce nuestros programas
              </Button>
            </a>
            <Button variant="primary" size="lg" icon="graduation-cap" fullWidth onClick={() => navigate("/login")} style={{ width: "100%" }}>
              Ingresar a la plataforma
            </Button>
          </div>
        </div>
      </section>

      {/* PROGRAMAS */}
      <section id="programas" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>{"// PROGRAMAS"}</SectionEyebrow>
          <h2 className="mt-3">Un programa para cada etapa</h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PROGRAMS.map((program) => (
            <Card key={program.title} accent="brand" elevation="sm">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-brand-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={program.icon} size={26} color="var(--xp-orange)" />
              </div>
              <h3 className="mt-4">{program.title}</h3>
              <p className="mt-2" style={{ font: "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)", color: "var(--text-muted)" }}>
                {program.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section id="metodologia" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>{"// METODOLOGÍA"}</SectionEyebrow>
            <h2 className="mt-3">Una experiencia de aprendizaje más completa</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPS.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={item.icon} size={20} color="var(--cyan-700)" />
                </div>
                <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-heading)" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>{"// CÓMO FUNCIONA"}</SectionEyebrow>
          <h2 className="mt-3">Empezar es simple</h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className="mx-auto"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--radius-full, 999px)",
                  background: "var(--xp-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "var(--shadow-brand)",
                }}
              >
                <Icon name={step.icon} size={24} color="var(--text-on-brand)" />
              </div>
              <div className="mt-3" style={{ font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)", letterSpacing: ".08em", color: "var(--text-brand)" }}>
                PASO {step.number}
              </div>
              <p className="mt-1" style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)", color: "var(--text-heading)" }}>
                {step.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN PLATAFORMA */}
      <section id="nosotros" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div
          className="flex flex-col items-center gap-6 text-center sm:gap-8"
          style={{
            background: "var(--xp-black)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 24px",
          }}
        >
          <Icon name="laptop" size={40} color="var(--xp-cyan)" />
          <div>
            <h2 style={{ color: "var(--text-inverse)" }}>Todo tu aprendizaje en un solo lugar</h2>
            <p
              className="mx-auto mt-3 max-w-xl"
              style={{ font: "var(--weight-regular) var(--text-body-size)/1.6 var(--font-body)", color: "var(--neutral-300)" }}
            >
              Desde tu cuenta puedes consultar tus salones, tus clases, tus materiales y tus horas -- todo en un mismo lugar, disponible cuando lo
              necesites.
            </p>
          </div>
          <Button variant="accent" size="lg" icon="graduation-cap" onClick={() => navigate("/login")}>
            Ingresar a la plataforma
          </Button>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contacto" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2>Empieza tu experiencia con Xplore English</h2>
          <p className="mt-3" style={{ font: "var(--weight-regular) var(--text-body-size)/1.6 var(--font-body)", color: "var(--text-muted)" }}>
            Escríbenos si tienes preguntas sobre nuestros programas -- información de contacto próximamente.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="secondary" size="lg" icon="envelope-simple" fullWidth style={{ width: "100%" }} className="sm:w-auto">
              Contáctanos
            </Button>
            <Button variant="primary" size="lg" icon="arrow-right" fullWidth style={{ width: "100%" }} onClick={() => navigate("/login")}>
              Ir a la plataforma
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
