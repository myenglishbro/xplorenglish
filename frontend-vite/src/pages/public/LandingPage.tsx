import { useNavigate } from "react-router-dom";

import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";
import { LandingNavbar } from "@/components/public/LandingNavbar";
import { LandingFooter } from "@/components/public/LandingFooter";
import { useState } from "react";
const HERO_IMAGE =
  "https://i.ibb.co/RTQBdWz7/Chat-GPT-Image-14-sept-2026-13-46-52.png";

/**
 * Coloca aquí la URL real de Sandra cuando la tengas.
 */
const FOUNDER_IMAGE = "https://i.ibb.co/yBSm3nYw/Chat-GPT-Image-14-sept-2026-14-27-53.png";

/**
 * Para las imágenes secundarias te recomiendo descargarlas
 * y guardarlas localmente en /public/images/landing/
 *
 * Puedes reemplazar estas rutas por imágenes propias.
 */
const SUPPORT_IMAGES = {
  methodology: "https://lewis-school.co.uk/wp-content/uploads/2022/03/young-lady-online700x700.jpg",
  kids: "https://cdn.prod.website-files.com/5e3bef72f3a7cb5bd9d03afe/644d369876ce89489913baf1_LingoAce%20Lesons%20(4).webp",
};



const PROGRAMS = [
  {
    icon: "rocket-launch",
    title: "Inglés desde Cero",
    audience: "Adultos",
    category: "adultos",
    description:
      "Construye una base sólida desde el inicio con un plan adaptado a tu ritmo y aprende a comunicarte desde las primeras clases.",
  },
  {
    icon: "student",
    title: "Inglés desde Cero",
    audience: "Niños y adolescentes",
    category: "kids",
    description:
      "Aprendizaje progresivo y personalizado para desarrollar vocabulario, comprensión, pronunciación y confianza.",
  },
  {
    icon: "chats-circle",
    title: "Inglés Conversacional",
    audience: "Adultos",
    category: "adultos",
    description:
      "Desarrolla fluidez, pronunciación y seguridad mediante conversaciones vinculadas con situaciones reales.",
  },
  {
    icon: "smiley",
    title: "Inglés Conversacional",
    audience: "Niños",
    category: "kids",
    description:
      "Actividades comunicativas adaptadas a la edad para expresarse en inglés de manera natural y progresiva.",
  },
  {
    icon: "books",
    title: "Inglés para Escolares",
    audience: "Refuerzo y nivelación",
    category: "academico",
    description:
      "Acompañamiento individual para reforzar contenidos, resolver dificultades y mejorar el desempeño escolar.",
  },
  {
    icon: "graduation-cap",
    title: "Inglés Académico",
    audience: "Universidades e institutos",
    category: "academico",
    description:
      "Refuerzo y nivelación para afrontar con mayor seguridad las exigencias académicas en inglés.",
  },
  {
    icon: "briefcase",
    title: "Inglés para Profesionales",
    audience: "Trabajo y desarrollo profesional",
    category: "profesional",
    description:
      "Inglés aplicado a reuniones, presentaciones, correos y situaciones propias de tu entorno profesional.",
  },
  {
    icon: "users-three",
    title: "Entrevistas de Trabajo",
    audience: "Preparación específica",
    category: "profesional",
    description:
      "Practica preguntas reales, estructura tus respuestas y desarrolla seguridad para comunicar tu experiencia profesional.",
  },
  {
    icon: "airplane-tilt",
    title: "Inglés para Viajes",
    audience: "Situaciones reales",
    category: "viajes",
    description:
      "Prepárate para desenvolverte con confianza en aeropuertos, hoteles, restaurantes y diferentes situaciones de viaje.",
  },
  {
    icon: "globe",
    title: "Work & Travel, Au Pair y Visa J1",
    audience: "Preparación internacional",
    category: "viajes",
    description:
      "Desarrolla el inglés necesario para entrevistas, procesos de selección y comunicación durante tu experiencia internacional.",
  },
  {
    icon: "certificate",
    title: "Exámenes Internacionales",
    audience: "Preparación especializada",
    category: "examenes",
    description:
      "Entrenamiento estratégico y personalizado para certificaciones internacionales de inglés.",
  },
];


const PROGRAM_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "adultos", label: "Adultos" },
  { value: "kids", label: "Kids & Teens" },
  { value: "academico", label: "Académico" },
  { value: "profesional", label: "Profesional" },
  { value: "viajes", label: "Viajes" },
  { value: "examenes", label: "Exámenes" },
];

const DIFFERENTIALS = [
  {
    number: "01",
    title: "100% personalizado",
    description:
      "Tu programa se construye a partir de tu nivel, necesidades y objetivos.",
  },
  {
    number: "02",
    title: "Atención 1 a 1",
    description:
      "Tu profesor concentra la sesión en tu progreso y en las áreas que necesitas desarrollar.",
  },
  {
    number: "03",
    title: "Flexibilidad real",
    description:
      "Organiza tus clases de acuerdo con tu disponibilidad y frecuencia de estudio.",
  },
  {
    number: "04",
    title: "Inglés para situaciones reales",
    description:
      "Trabajamos el idioma para que puedas utilizarlo en contextos académicos, profesionales y personales.",
  },
];

const METHOD_STEPS = [
  {
    number: "01",
    title: "Diagnosticar",
    description:
      "Conocemos tu punto de partida, tus fortalezas y tus objetivos.",
  },
  {
    number: "02",
    title: "Personalizar",
    description:
      "Diseñamos una ruta de aprendizaje adaptada a tus necesidades.",
  },
  {
    number: "03",
    title: "Acompañar",
    description:
      "Tu docente guía, corrige y monitorea tu progreso de manera continua.",
  },
  {
    number: "04",
    title: "Transformar",
    description:
      "Desarrollas el inglés que necesitas para desenvolverte en situaciones reales.",
  },
];

const PACKAGES = [
  {
    name: "Smart Pack",
    hours: "8 horas",
    cadence: "al mes",
    price: "S/ 296",
    note: "2 horas por semana",
    featured: false,
  },
  {
    name: "Power Pack",
    hours: "12 horas",
    cadence: "al mes",
    price: "S/ 420",
    note: "3 horas por semana",
    featured: true,
  },
  {
    name: "Elite Pack",
    hours: "20 horas",
    cadence: "libres",
    price: "S/ 660",
    featured: false,
  },
  {
    name: "Full Pack",
    hours: "40 horas",
    cadence: "libres",
    price: "S/ 1,188",
    discount: "10% de descuento",
    featured: false,
  },
  {
    name: "Deluxe Pack",
    hours: "60 horas",
    cadence: "libres",
    price: "S/ 1,683",
    discount: "15% de descuento",
    featured: false,
  },
];

const PACKAGE_BENEFITS = [
  "Clases online 1 a 1",
  "Diagnóstico inicial",
  "Plan de aprendizaje personalizado",
  "Speaking, Listening, Grammar y Vocabulary",
  "Horarios flexibles",
  "Seguimiento del progreso",
  "Material digital incluido",
];

const TESTIMONIALS = [
  {
    quote:
      "Las clases están enfocadas en mis metas profesionales, utilizando vocabulario que necesito para el trabajo. Estas clases personalizadas me motivan mucho para seguir mejorando.",
  },
  {
    quote:
      "Tengo horario laboral rotativo y puedo programar las sesiones semana a semana. Eso me permite seguir avanzando sin descuidar mi trabajo.",
  },
  {
    quote:
      "Las clases se adaptan a mis tiempos y a mi ritmo. Si tengo dudas, me ayudan a resolverlas hasta que aprenda de verdad.",
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "var(--cyan-700)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 1,
          background: "var(--cyan-700)",
          opacity: 0.65,
        }}
      />
      {children}
    </span>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  const [programFilter, setProgramFilter] = useState("todos");

  const filteredPrograms =
    programFilter === "todos"
      ? PROGRAMS
      : PROGRAMS.filter(
          (program) => program.category === programFilter
        );

  return (
    <div
      style={{
        background: "#f7f8f8",
        color: "var(--text-heading)",
      }}
    >
      <LandingNavbar />

      {/* HERO */}
      <section
        id="inicio"
        className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:pb-28 lg:pt-16"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-16">
          <div>
            <SectionEyebrow>
              Academia boutique de inglés online
            </SectionEyebrow>

            <h1
              className="mt-5"
              style={{
                maxWidth: 650,
                font:
                  "var(--weight-extrabold) clamp(42px,5.4vw,68px)/1.03 var(--font-display)",
                letterSpacing: "-0.045em",
                color: "var(--text-heading)",
              }}
            >
              Tu inglés.
              <br />
              Tus objetivos.
              <br />
              <span style={{ color: "var(--cyan-700)" }}>
                Tu propio plan.
              </span>
            </h1>

            <p
              className="mt-6"
              style={{
                maxWidth: 590,
                font:
                  "var(--weight-regular) var(--text-body-lg-size)/1.7 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Clases de inglés online 1 a 1 diseñadas alrededor de tu nivel,
              tus objetivos y tu ritmo. Sin programas genéricos: construimos
              una experiencia de aprendizaje para ti.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#programas" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon="arrow-right"
                >
                  Encuentra tu programa
                </Button>
              </a>

              <Button
                variant="secondary"
                size="lg"
                icon="graduation-cap"
                fullWidth
                onClick={() => navigate("/login")}
              >
                Ingresar a la plataforma
              </Button>
            </div>

            <div
              className="mt-9 flex flex-wrap gap-x-8 gap-y-4 pt-6"
              style={{
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              {[
                "Clases 1 a 1",
                "100% online",
                "Horarios flexibles",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Icon
                    name="check-circle"
                    size={17}
                    color="var(--cyan-700)"
                  />
                  <span
                    style={{
                      font:
                        "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              style={{
                position: "absolute",
                inset: "6% -3% -5% 10%",
                borderRadius: 34,
                background: "rgba(10,35,66,.05)",
              }}
            />

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 26,
                background: "#e8edef",
                boxShadow:
                  "0 28px 70px rgba(15,23,42,.12), 0 3px 10px rgba(15,23,42,.05)",
              }}
            >
              <img
                src={HERO_IMAGE}
                alt="Experiencia de aprendizaje personalizada en X-plore English"
                style={{
                  width: "100%",
                  height: "clamp(470px,54vw,620px)",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div
              className="hidden sm:block"
              style={{
                position: "absolute",
                left: -30,
                bottom: 34,
                width: 270,
                padding: 18,
                borderRadius: 16,
                background: "rgba(255,255,255,.96)",
                border: "1px solid rgba(15,23,42,.08)",
                boxShadow: "0 18px 44px rgba(15,23,42,.12)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span
                style={{
                  display: "block",
                  font:
                    "var(--weight-bold) var(--text-body-sm-size)/1.45 var(--font-body)",
                }}
              >
                Diagnosticar → Personalizar
                <br />
                Acompañar → Transformar
              </span>

              <span
                style={{
                  display: "block",
                  marginTop: 6,
                  font:
                    "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
                  color: "var(--text-muted)",
                }}
              >
                Una ruta diseñada alrededor de ti.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIALES */}
      <section
        style={{
          background: "#ffffff",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {DIFFERENTIALS.map((item) => (
              <div key={item.number}>
                <span
                  style={{
                    font:
                      "var(--weight-bold) var(--text-caption-size)/1 var(--font-display)",
                    color: "var(--cyan-700)",
                    letterSpacing: ".08em",
                  }}
                >
                  {item.number}
                </span>

                <h3
                  className="mt-3"
                  style={{
                    font:
                      "var(--weight-bold) var(--text-body-size)/1.25 var(--font-display)",
                  }}
                >
                  {item.title}
                </h3>

                <p
                  className="mt-2"
                  style={{
                    font:
                      "var(--weight-regular) var(--text-body-sm-size)/1.65 var(--font-body)",
                    color: "var(--text-muted)",
                  }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMAS */}
     {/* PROGRAMAS */}
<section
  id="programas"
  className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24"
>
  <div className="grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
    <div>
      <SectionEyebrow>Programas</SectionEyebrow>

      <h2
        className="mt-4"
        style={{
          maxWidth: 620,
          font:
            "var(--weight-bold) clamp(32px,4vw,46px)/1.1 var(--font-display)",
          letterSpacing: "-.03em",
        }}
      >
        Encuentra el programa que se adapta a tu objetivo
      </h2>
    </div>

    <p
      className="lg:ml-auto"
      style={{
        maxWidth: 560,
        font:
          "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      No todos necesitan el mismo inglés. Elige el tipo de programa que
      buscas y descubre las opciones diseñadas para cada etapa, necesidad
      y objetivo.
    </p>
  </div>

  {/* FILTROS */}
  <div
    className="mt-9 flex gap-2 overflow-x-auto pb-2"
    style={{
      scrollbarWidth: "none",
    }}
  >
    {PROGRAM_FILTERS.map((filter) => {
      const isActive = programFilter === filter.value;

      return (
        <button
          key={filter.value}
          type="button"
          onClick={() => setProgramFilter(filter.value)}
          aria-pressed={isActive}
          style={{
            flexShrink: 0,
            padding: "10px 16px",
            borderRadius: 999,
            border: isActive
              ? "1px solid #0c2a3e"
              : "1px solid #dfe5e8",
            background: isActive ? "#0c2a3e" : "#ffffff",
            color: isActive ? "#ffffff" : "#405362",
            cursor: "pointer",
            font:
              "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)",
            transition:
              "background .2s ease, color .2s ease, border-color .2s ease, transform .2s ease",
          }}
        >
          {filter.label}
        </button>
      );
    })}
  </div>

  {/* CONTADOR */}
  <div
    className="mt-5"
    style={{
      font:
        "var(--weight-medium) var(--text-caption-size)/1.4 var(--font-body)",
      color: "var(--text-muted)",
    }}
  >
    {filteredPrograms.length}{" "}
    {filteredPrograms.length === 1 ? "programa" : "programas"}
  </div>

  {/* CARDS */}
  <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
    {filteredPrograms.map((program) => (
      <article
        key={`${program.title}-${program.audience}`}
        className="group"
        style={{
          minHeight: 245,
          padding: 26,
          borderRadius: 18,
          background: "#ffffff",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 8px 26px rgba(15,23,42,.035)",
          transition:
            "transform .22s ease, box-shadow .22s ease, border-color .22s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 11,
              background: "#f1f5f6",
              border: "1px solid #e7ecee",
            }}
          >
            <Icon
              name={program.icon}
              size={19}
              color="var(--cyan-700)"
            />
          </div>

          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "#f3f5f6",
              font:
                "var(--weight-semibold) 10px/1 var(--font-body)",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            1 a 1
          </span>
        </div>

        <div
          className="mt-5"
          style={{
            font:
              "var(--weight-bold) var(--text-micro-size)/1.2 var(--font-display)",
            color: "var(--cyan-700)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          {program.audience}
        </div>

        <h3
          className="mt-2"
          style={{
            font:
              "var(--weight-bold) 21px/1.22 var(--font-display)",
          }}
        >
          {program.title}
        </h3>

        <p
          className="mt-3"
          style={{
            font:
              "var(--weight-regular) var(--text-body-sm-size)/1.65 var(--font-body)",
            color: "var(--text-muted)",
          }}
        >
          {program.description}
        </p>

        <div
          className="mt-6 flex items-center gap-2"
          style={{
            font:
              "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)",
            color: "var(--cyan-700)",
          }}
        >
          <span>Programa personalizado</span>
          <Icon
            name="arrow-right"
            size={15}
            color="var(--cyan-700)"
          />
        </div>
      </article>
    ))}
  </div>
</section>

      {/* METODOLOGÍA */}
      <section
        id="metodologia"
        style={{
          background: "#eef2f3",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[.88fr_1.12fr]">
            <div
              style={{
                overflow: "hidden",
                borderRadius: 24,
                background: "#dfe5e8",
              }}
            >
              <img
                src={SUPPORT_IMAGES.methodology}
                alt="Docente acompañando a un estudiante durante una clase personalizada"
                style={{
                  width: "100%",
                  height: 560,
                  objectFit: "cover",
                  filter: "saturate(.75)",
                }}
              />
            </div>

            <div>
              <SectionEyebrow>Filosofía metodológica</SectionEyebrow>

              <h2
                className="mt-4"
                style={{
                  maxWidth: 640,
                  font:
                    "var(--weight-bold) clamp(32px,4vw,46px)/1.1 var(--font-display)",
                  letterSpacing: "-.03em",
                }}
              >
                No todos aprenden inglés de la misma manera
              </h2>

              <p
                className="mt-5"
                style={{
                  maxWidth: 630,
                  font:
                    "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                  color: "var(--text-muted)",
                }}
              >
                Cada estudiante tiene objetivos, experiencias previas,
                fortalezas, dificultades y ritmos diferentes. Por eso partimos
                de un diagnóstico individual y seleccionamos las estrategias,
                recursos y actividades que mejor respondan a cada proceso.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {METHOD_STEPS.map((step) => (
                  <div
                    key={step.number}
                    style={{
                      padding: 22,
                      borderRadius: 15,
                      background: "#ffffff",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        font:
                          "var(--weight-bold) var(--text-caption-size)/1 var(--font-display)",
                        color: "var(--cyan-700)",
                      }}
                    >
                      {step.number}
                    </span>

                    <h3
                      className="mt-3"
                      style={{
                        font:
                          "var(--weight-bold) var(--text-body-size)/1.3 var(--font-display)",
                      }}
                    >
                      {step.title}
                    </h3>

                    <p
                      className="mt-2"
                      style={{
                        font:
                          "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-8 flex flex-wrap gap-3"
                style={{
                  font:
                    "var(--weight-semibold) var(--text-caption-size)/1.3 var(--font-body)",
                  color: "var(--text-muted)",
                }}
              >
                <span>Communicative Approach</span>
                <span>•</span>
                <span>Task-Based Learning</span>
                <span>•</span>
                <span>Personalized Feedback</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KIDS & TEENS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div
          className="grid overflow-hidden lg:grid-cols-2"
          style={{
            borderRadius: 24,
            background: "#ffffff",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              minHeight: 470,
              background: "#e8edef",
            }}
          >
            <img
              src={SUPPORT_IMAGES.kids}
              alt="Estudiante joven aprendiendo inglés online"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 470,
                objectFit: "cover",
                filter: "saturate(.8)",
              }}
            />
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <SectionEyebrow>Kids & Teens</SectionEyebrow>

            <h2
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) clamp(30px,4vw,43px)/1.12 var(--font-display)",
                letterSpacing: "-.025em",
              }}
            >
              Inglés que también se adapta a su etapa
            </h2>

            <p
              className="mt-5"
              style={{
                font:
                  "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Programas 1 a 1 para niños desde los 6 años y adolescentes,
              diseñados para empezar desde cero, reforzar el colegio,
              desarrollar fluidez o prepararse para retos académicos.
            </p>

            <div className="mt-7 grid gap-3">
              {[
                "Actividades adaptadas a cada edad",
                "Refuerzo inmediato de dificultades",
                "Desarrollo de Listening, Speaking, Reading y Writing",
                "Mayor confianza para participar y comunicarse",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Icon
                    name="check-circle"
                    size={18}
                    color="var(--cyan-700)"
                  />
                  <span
                    style={{
                      font:
                        "var(--weight-medium) var(--text-body-sm-size)/1.5 var(--font-body)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* SOBRE SANDRA */}
      <section
        id="nosotros"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
          <div
            style={{
              minHeight: 520,
              overflow: "hidden",
              borderRadius: 24,
              background: "#e9edef",
            }}
          >
            {FOUNDER_IMAGE ? (
              <img
                src={FOUNDER_IMAGE}
                alt="Sandra Thalia Casanova Pérez"
                style={{
                  width: "100%",
                  height: 520,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  height: 520,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div>
                  <Icon
                    name="user"
                    size={42}
                    color="var(--neutral-400)"
                  />
                  <p
                    style={{
                      marginTop: 12,
                      font:
                        "var(--weight-medium) var(--text-body-sm-size)/1.5 var(--font-body)",
                    }}
                  >
                    Agrega aquí la URL
                    <br />
                    de la fotografía de Sandra
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <SectionEyebrow>Fundadora y Directora</SectionEyebrow>

            <h2
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) clamp(32px,4vw,46px)/1.12 var(--font-display)",
                letterSpacing: "-.03em",
              }}
            >
              Sandra Thalia Casanova Pérez
            </h2>

            <p
              className="mt-5"
              style={{
                font:
                  "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Docente de inglés con más de 12 años de experiencia en la
              enseñanza del idioma y una trayectoria especializada en el
              desarrollo de competencias comunicativas y aprendizaje
              personalizado.
            </p>

            <p
              className="mt-4"
              style={{
                font:
                  "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Su experiencia trabajando con estudiantes de diferentes edades,
              niveles y objetivos dio origen a X-plore English y a una
              convicción que guía toda nuestra propuesta.
            </p>

            <blockquote
              className="mt-8"
              style={{
                marginLeft: 0,
                paddingLeft: 24,
                borderLeft: "3px solid var(--cyan-700)",
                font:
                  "var(--weight-semibold) 24px/1.45 var(--font-display)",
                color: "var(--text-heading)",
              }}
            >
              “La enseñanza debe adaptarse al estudiante y no el estudiante a
              la metodología.”
            </blockquote>

            <p
              className="mt-6"
              style={{
                font:
                  "var(--weight-bold) var(--text-body-sm-size)/1.4 var(--font-body)",
                color: "var(--cyan-700)",
              }}
            >
              English for the real world.
            </p>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section
        style={{
          background: "#0b2437",
          color: "#ffffff",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Paquetes 2026</SectionEyebrow>

            <h2
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) clamp(32px,4vw,46px)/1.12 var(--font-display)",
                letterSpacing: "-.03em",
                color: "#ffffff",
              }}
            >
              Elige la intensidad que mejor se adapte a tus objetivos
            </h2>

            <p
              className="mx-auto mt-4"
              style={{
                maxWidth: 650,
                font:
                  "var(--weight-regular) var(--text-body-size)/1.7 var(--font-body)",
                color: "rgba(255,255,255,.66)",
              }}
            >
              Todos los planes mantienen el mismo enfoque 1 a 1 y
              personalizado. La diferencia está en la cantidad de horas que
              deseas utilizar.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {PACKAGES.map((pack) => (
              <article
                key={pack.name}
                style={{
                  position: "relative",
                  padding: "26px 22px",
                  borderRadius: 18,
                  background: pack.featured
                    ? "#ffffff"
                    : "rgba(255,255,255,.06)",
                  color: pack.featured ? "#102432" : "#ffffff",
                  border: pack.featured
                    ? "1px solid rgba(255,255,255,.9)"
                    : "1px solid rgba(255,255,255,.10)",
                  boxShadow: pack.featured
                    ? "0 20px 50px rgba(0,0,0,.16)"
                    : "none",
                }}
              >
                {pack.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "var(--xp-orange)",
                      color: "#111",
                      font:
                        "var(--weight-bold) 10px/1 var(--font-display)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    Recomendado
                  </div>
                )}

                <h3
                  style={{
                    font:
                      "var(--weight-bold) 19px/1.25 var(--font-display)",
                  }}
                >
                  {pack.name}
                </h3>

                <div
                  className="mt-5"
                  style={{
                    font:
                      "var(--weight-bold) 30px/1.1 var(--font-display)",
                  }}
                >
                  {pack.hours}
                </div>

                <div
                  className="mt-1"
                  style={{
                    font:
                      "var(--weight-regular) var(--text-caption-size)/1.3 var(--font-body)",
                    opacity: 0.68,
                  }}
                >
                  {pack.cadence}
                </div>

                <div
                  className="mt-7"
                  style={{
                    font:
                      "var(--weight-extrabold) 31px/1 var(--font-display)",
                    color: pack.featured
                      ? "var(--cyan-700)"
                      : "#ffffff",
                  }}
                >
                  {pack.price}
                </div>

                {pack.note && (
                  <div
                    className="mt-3"
                    style={{
                      font:
                        "var(--weight-medium) var(--text-caption-size)/1.4 var(--font-body)",
                      opacity: 0.7,
                    }}
                  >
                    {pack.note}
                  </div>
                )}

                {pack.discount && (
                  <div
                    className="mt-3"
                    style={{
                      font:
                        "var(--weight-semibold) var(--text-caption-size)/1.4 var(--font-body)",
                      color: pack.featured
                        ? "var(--cyan-700)"
                        : "#8dddea",
                    }}
                  >
                    {pack.discount}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div
            className="mt-10"
            style={{
              padding: 30,
              borderRadius: 18,
              background: "rgba(255,255,255,.055)",
              border: "1px solid rgba(255,255,255,.10)",
            }}
          >
            <h3
              style={{
                font:
                  "var(--weight-bold) 20px/1.3 var(--font-display)",
                color: "#ffffff",
              }}
            >
              Todos nuestros paquetes incluyen
            </h3>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PACKAGE_BENEFITS.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3"
                >
                  <Icon
                    name="check-circle"
                    size={18}
                    color="var(--xp-cyan)"
                  />

                  <span
                    style={{
                      font:
                        "var(--weight-medium) var(--text-body-sm-size)/1.5 var(--font-body)",
                      color: "rgba(255,255,255,.78)",
                    }}
                  >
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLASE DIAGNÓSTICO */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div
          className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"
          style={{
            padding: "44px 42px",
            borderRadius: 24,
            background: "#ffffff",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 14px 42px rgba(15,23,42,.045)",
          }}
        >
          <div>
            <SectionEyebrow>Antes de decidir</SectionEyebrow>

            <h2
              className="mt-4"
              style={{
                maxWidth: 700,
                font:
                  "var(--weight-bold) clamp(30px,4vw,42px)/1.13 var(--font-display)",
                letterSpacing: "-.025em",
              }}
            >
              Conoce a tu profesor antes de elegir un paquete
            </h2>

            <p
              className="mt-4"
              style={{
                maxWidth: 680,
                font:
                  "var(--weight-regular) var(--text-body-size)/1.7 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Agenda una clase diagnóstico 1 a 1 por S/45. Conoce tu punto de
              partida, experimenta nuestra metodología y recibe una
              recomendación de ruta antes de continuar.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Evaluación de nivel o introducción desde cero",
                "Clase personalizada 1 a 1",
                "Recomendación de programa",
                "Ruta inicial de aprendizaje",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Icon
                    name="check-circle"
                    size={18}
                    color="var(--cyan-700)"
                  />
                  <span
                    style={{
                      font:
                        "var(--weight-medium) var(--text-body-sm-size)/1.5 var(--font-body)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="mt-6"
              style={{
                font:
                  "var(--weight-semibold) var(--text-body-sm-size)/1.5 var(--font-body)",
                color: "var(--cyan-700)",
              }}
            >
              Si decides continuar, los S/45 se descuentan del valor de tu
              programa.
            </p>
          </div>

          <div
            className="text-center"
            style={{
              minWidth: 220,
              padding: 28,
              borderRadius: 18,
              background: "#f2f5f6",
            }}
          >
            <div
              style={{
                font:
                  "var(--weight-semibold) var(--text-caption-size)/1.3 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Clase diagnóstico
            </div>

            <div
              className="mt-3"
              style={{
                font:
                  "var(--weight-extrabold) 40px/1 var(--font-display)",
                color: "var(--text-heading)",
              }}
            >
              S/45
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section
        style={{
          background: "#eef2f3",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>Testimonios reales</SectionEyebrow>

            <h2
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) clamp(32px,4vw,46px)/1.12 var(--font-display)",
                letterSpacing: "-.03em",
              }}
            >
              Lo que valoran nuestros estudiantes
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {TESTIMONIALS.map((item, index) => (
              <article
                key={index}
                style={{
                  minHeight: 250,
                  padding: 28,
                  borderRadius: 18,
                  background: "#ffffff",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    font:
                      "var(--weight-bold) 42px/1 var(--font-display)",
                    color: "rgba(17,138,178,.22)",
                  }}
                >
                  “
                </div>

                <p
                  className="mt-4"
                  style={{
                    font:
                      "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                    color: "var(--text-heading)",
                  }}
                >
                  {item.quote}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MISIÓN Y VISIÓN */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <SectionEyebrow>X-plore English</SectionEyebrow>

          <h2
            className="mt-4"
            style={{
              font:
                "var(--weight-bold) clamp(32px,4vw,46px)/1.12 var(--font-display)",
              letterSpacing: "-.03em",
            }}
          >
            Una forma diferente de aprender inglés
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div
            style={{
              padding: 34,
              borderRadius: 20,
              background: "#ffffff",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                font:
                  "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                color: "var(--cyan-700)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              Nuestra misión
            </span>

            <h3
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) 27px/1.25 var(--font-display)",
              }}
            >
              Transformar la manera de aprender inglés
            </h3>

            <p
              className="mt-4"
              style={{
                font:
                  "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                color: "var(--text-muted)",
              }}
            >
              Mediante una enseñanza 1 a 1, personalizada y enfocada en
              objetivos reales, brindando flexibilidad, acompañamiento y una
              experiencia de aprendizaje de alta calidad.
            </p>
          </div>

          <div
            style={{
              padding: 34,
              borderRadius: 20,
              background: "#0c2438",
              color: "#ffffff",
            }}
          >
            <span
              style={{
                font:
                  "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
                color: "var(--xp-cyan)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              Nuestra visión
            </span>

            <h3
              className="mt-4"
              style={{
                font:
                  "var(--weight-bold) 27px/1.25 var(--font-display)",
                color: "#ffffff",
              }}
            >
              Ser una academia boutique reconocida por su experiencia
              personalizada
            </h3>

            <p
              className="mt-4"
              style={{
                font:
                  "var(--weight-regular) var(--text-body-size)/1.75 var(--font-body)",
                color: "rgba(255,255,255,.67)",
              }}
            >
              Consolidarnos como una opción preferida por estudiantes,
              adultos y profesionales que buscan aprender inglés de manera
              efectiva, práctica y adaptada a su realidad.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        id="contacto"
        style={{
          background: "#ffffff",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <SectionEyebrow>Da el primer paso</SectionEyebrow>

              <h2
                className="mt-4"
                style={{
                  maxWidth: 720,
                  font:
                    "var(--weight-bold) clamp(32px,4vw,46px)/1.12 var(--font-display)",
                  letterSpacing: "-.03em",
                }}
              >
                Tu inglés del mundo real comienza aquí
              </h2>

              <p
                className="mt-4"
                style={{
                  maxWidth: 640,
                  font:
                    "var(--weight-regular) var(--text-body-size)/1.7 var(--font-body)",
                  color: "var(--text-muted)",
                }}
              >
                Cuéntanos qué necesitas y te ayudaremos a identificar el
                programa, profesor y ritmo de estudio más adecuados para ti.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
                <span
                  style={{
                    font:
                      "var(--weight-semibold) var(--text-body-sm-size)/1.4 var(--font-body)",
                  }}
                >
                  WhatsApp: +51 937 490 440
                </span>

                <span
                  style={{
                    font:
                      "var(--weight-regular) var(--text-body-sm-size)/1.4 var(--font-body)",
                    color: "var(--text-muted)",
                  }}
                >
                  X-plore English E.I.R.L.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="lg"
                icon="envelope-simple"
                fullWidth
              >
                Contáctanos
              </Button>

              <Button
                variant="primary"
                size="lg"
                icon="graduation-cap"
                fullWidth
                onClick={() => navigate("/login")}
              >
                Ingresar a la plataforma
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}