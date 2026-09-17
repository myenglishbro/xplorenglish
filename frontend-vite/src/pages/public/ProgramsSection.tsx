import { useState } from "react";

import {
  ProgramCard,
  type ProgramCardData,
} from "./ProgramCard";

/* =========================================================
   BRAND
========================================================= */

const WHATSAPP_URL = "https://wa.link/d48tyx";

const LOGO_URL =
  "https://i.ibb.co/s98L0HxT/explore-english-1.png";

/* =========================================================
   PROGRAM IMAGES
========================================================= */

const PROGRAM_IMAGES = {
  adultosDesdeCero:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=85",

  kidsDesdeCero:
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85",

  conversacionalAdultos:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85",

  conversacionalKids:
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1400&q=85",

  escolares:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=85",

  academico:
    "https://plus.unsplash.com/premium_photo-1683887034491-f58b4c4fca72?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",

  profesionales:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85",

  entrevistas:
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=85",

  viajes:
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=85",

  workTravel:
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1400&q=85",
coaching:
    "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  examenes:
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=85",
} as const;

/* =========================================================
   TYPES
========================================================= */

type ProgramCategory =
  | "adultos"
  | "kids"
  | "academico"
  | "profesional"
  | "viajes"
    | "coaching"

  | "examenes";

type Program = ProgramCardData & {
  category: ProgramCategory;
};

/* =========================================================
   PROGRAM DATA
========================================================= */

const PROGRAMS: Program[] = [
  {
    icon: "rocket-launch",
    title: "Inglés desde Cero",
    audience: "Adultos",
    category: "adultos",
    image: PROGRAM_IMAGES.adultosDesdeCero,
    description:
      "Construye una base sólida desde el inicio y aprende a comunicarte con seguridad desde las primeras clases.",
  },
  {
    icon: "student",
    title: "Inglés desde Cero",
    audience: "Niños y adolescentes",
    category: "kids",
    image: PROGRAM_IMAGES.kidsDesdeCero,
    description:
      "Aprendizaje progresivo y personalizado para desarrollar vocabulario, comprensión y confianza.",
  },
  {
    icon: "chats-circle",
    title: "Inglés Conversacional",
    audience: "Adultos",
    category: "adultos",
    image: PROGRAM_IMAGES.conversacionalAdultos,
    description:
      "Desarrolla fluidez, pronunciación y seguridad mediante conversaciones vinculadas con situaciones reales.",
  },
  {
    icon: "smiley",
    title: "Inglés Conversacional",
    audience: "Niños",
    category: "kids",
    image: PROGRAM_IMAGES.conversacionalKids,
    description:
      "Actividades comunicativas adaptadas a la edad para expresarse en inglés de manera natural y progresiva.",
  },
  {
    icon: "books",
    title: "Inglés para Escolares",
    audience: "Refuerzo y nivelación",
    category: "academico",
    image: PROGRAM_IMAGES.escolares,
    description:
      "Acompañamiento individual para reforzar contenidos, resolver dificultades y mejorar el desempeño escolar.",
  },
  {
    icon: "graduation-cap",
    title: "Inglés Académico",
    audience: "Universidades e institutos",
    category: "academico",
    image: PROGRAM_IMAGES.academico,
    description:
      "Refuerzo y nivelación para afrontar con mayor seguridad las exigencias académicas en inglés.",
  },
  {
    icon: "briefcase",
    title: "Inglés para Profesionales",
    audience: "Trabajo y desarrollo profesional",
    category: "profesional",
    image: PROGRAM_IMAGES.profesionales,
    description:
      "Inglés aplicado a reuniones, presentaciones, correos y situaciones propias de tu entorno profesional.",
  },
  {
    icon: "users-three",
    title: "Entrevistas de Trabajo",
    audience: "Preparación específica",
    category: "profesional",
    image: PROGRAM_IMAGES.entrevistas,
    description:
      "Practica preguntas reales, estructura tus respuestas y desarrolla seguridad para comunicar tu experiencia.",
  },
  {
    icon: "airplane-tilt",
    title: "Inglés para Viajes",
    audience: "Situaciones reales",
    category: "viajes",
    image: PROGRAM_IMAGES.viajes,
    description:
      "Prepárate para desenvolverte con confianza en aeropuertos, hoteles, restaurantes y situaciones de viaje.",
  },
  {
    icon: "globe",
    title: "Work & Travel, Au Pair y Visa J1",
    audience: "Preparación internacional",
    category: "viajes",
    image: PROGRAM_IMAGES.workTravel,
    description:
      "Desarrolla el inglés necesario para entrevistas, procesos de selección y experiencias internacionales.",
  },
  {
    icon: "briefcase",
    title: "Coaching",
    audience: "Trabajo y desarrollo profesional",
    category: "profesional",
    image: PROGRAM_IMAGES.coaching,
    description:
      "Inglés aplicado a reuniones, presentaciones, correos y situaciones propias de tu entorno profesional.",
  },
  {
    icon: "certificate",
    title: "Exámenes Internacionales",
    audience: "Preparación especializada",
    category: "examenes",
    image: PROGRAM_IMAGES.examenes,
    description:
      "Entrenamiento estratégico y personalizado para certificaciones internacionales de inglés.",
  },
];

/* =========================================================
   FILTERS
========================================================= */

const FILTERS: {
  value: "todos" | ProgramCategory;
  label: string;
}[] = [
  { value: "todos", label: "Todos" },
  { value: "adultos", label: "Adultos" },
  { value: "kids", label: "Kids & Teens" },
  { value: "academico", label: "Académico" },
  { value: "profesional", label: "Profesional" },
  { value: "viajes", label: "Viajes" },
  { value: "examenes", label: "Exámenes" },
];

/* =========================================================
   COMPONENT
========================================================= */

export function ProgramsSection() {
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]["value"]>("todos");

  const [showAll, setShowAll] = useState(false);

  const filteredPrograms =
    activeFilter === "todos"
      ? PROGRAMS
      : PROGRAMS.filter(
          (program) => program.category === activeFilter,
        );

  const visiblePrograms =
    activeFilter === "todos" && !showAll
      ? filteredPrograms.slice(0, 3)
      : filteredPrograms;

  function handleFilter(
    filter: (typeof FILTERS)[number]["value"],
  ) {
    setActiveFilter(filter);
    setShowAll(false);
  }

  return (
    <section
      id="programas"
      className="
        relative
        overflow-hidden
        bg-[#f8faf9]
      "
    >
      {/* subtle top separator */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#dce4e5]
          to-transparent
        "
      />

      <div
        className="
          relative
          mx-auto
          max-w-[1320px]

          px-5
          pt-11
          pb-20

          sm:px-7
          sm:pt-12

          lg:px-8
          lg:pt-14
          lg:pb-24
        "
      >
        {/* ===================================================
            HEADER
        ==================================================== */}

        <div
          className="
            grid
            gap-8

            lg:grid-cols-[1fr_.82fr]
            lg:items-end
            lg:gap-16
          "
        >
          {/* LEFT */}

          <div>
            {/* EYEBROW */}

            <div className="flex items-center gap-3">
              <span
                className="
                  h-[2px]
                  w-7
                  rounded-full
                  bg-[#ff7100]
                "
              />

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[.15em]
                  text-[#d85f00]
                "
              >
                Nuestros programas
              </span>
            </div>

            {/* TITLE */}

            <h2
              className="
                mt-4
                max-w-[720px]

                text-[36px]
                font-bold
                leading-[1.06]
                tracking-[-.04em]
                text-[#102f43]

                sm:text-[42px]
                lg:text-[50px]
              "
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              Un programa para
              <br className="hidden sm:block" /> cada objetivo.
            </h2>

            {/* META */}

            <div
              className="
                mt-5
                flex
                flex-wrap
                items-center
                gap-x-5
                gap-y-2
              "
            >
              <span
                className="
                  text-[11px]
                  font-semibold
                  text-[#75858c]
                "
              >
                {PROGRAMS.length} programas
              </span>

              <span
                aria-hidden="true"
                className="
                  hidden
                  h-1
                  w-1
                  rounded-full
                  bg-[#ff7100]
                  sm:block
                "
              />

              <span
                className="
                  text-[11px]
                  font-semibold
                  text-[#75858c]
                "
              >
                Aprendizaje personalizado
              </span>

              <span
                aria-hidden="true"
                className="
                  hidden
                  h-1
                  w-1
                  rounded-full
                  bg-[#ff7100]
                  sm:block
                "
              />

              <span
                className="
                  text-[11px]
                  font-semibold
                  text-[#75858c]
                "
              >
                Clases online
              </span>
            </div>
          </div>

          {/* RIGHT */}

          <div
            className="
              flex
              flex-col
              gap-5
              lg:items-end
            "
          >
            {/* SMALL BRAND */}

            <div
              className="
                flex
                items-center
                gap-3
                self-start
                lg:self-end
              "
            >
              <span
                className="
                  hidden
                  h-px
                  w-10
                  bg-[#d8dfdf]
                  sm:block
                "
              />

              <span
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[.12em]
                  text-[#9aa6aa]
                "
              >
                By
              </span>

              <img
                src={LOGO_URL}
                alt="X-plore English"
                className="
                  block
                  h-[152px]
                  w-auto
                  max-w-[120px]
                  object-contain
                "
              />
            </div>

            {/* DESCRIPTION */}

            <p
              className="
                max-w-[510px]

                text-[15px]
                leading-[1.7]
                text-[#62747d]

                sm:text-[16px]
                lg:text-right
              "
              style={{
                fontFamily: "var(--font-body)",
              }}
            >
              No todos necesitan el mismo inglés. Elige una ruta
              diseñada alrededor de tu etapa, tus necesidades y
              aquello que quieres conseguir.
            </p>
          </div>
        </div>

        {/* ===================================================
            FILTERS
        ==================================================== */}

        <div
          className="
            mt-9
            border-y
            border-[#e1e7e7]
            py-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              overflow-x-auto
              pb-1

              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
            aria-label="Filtrar programas"
          >
            {FILTERS.map((filter) => {
              const active =
                activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    handleFilter(filter.value)
                  }
                  aria-pressed={active}
                  className={`
                    relative
                    min-h-[42px]
                    shrink-0
                    overflow-hidden
                    rounded-full
                    border
                    px-[17px]

                    text-[12px]
                    font-semibold

                    outline-none
                    transition-all
                    duration-200

                    focus-visible:ring-2
                    focus-visible:ring-[#ff7100]/30
                    focus-visible:ring-offset-2

                    ${
                      active
                        ? `
                          border-[#102f43]
                          bg-[#102f43]
                          text-white
                          shadow-[0_5px_14px_rgba(16,47,67,.12)]
                        `
                        : `
                          border-[#d9e1e2]
                          bg-white
                          text-[#52666f]

                          hover:-translate-y-[1px]
                          hover:border-[#f2b889]
                          hover:bg-[#fff8f3]
                          hover:text-[#d85f00]
                        `
                    }
                  `}
                >
                  {filter.label}

                  {active && (
                    <span
                      aria-hidden="true"
                      className="
                        absolute
                        bottom-0
                        left-1/2
                        h-[2px]
                        w-5
                        -translate-x-1/2
                        rounded-full
                        bg-[#ff7100]
                      "
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================================================
            RESULT META
        ==================================================== */}

        <div
          className="
            mt-6
            flex
            items-end
            justify-between
            gap-5
          "
        >
          <div>
            <span
              className="
                block
                text-[9px]
                font-bold
                uppercase
                tracking-[.12em]
                text-[#98a4a9]
              "
            >
              {activeFilter === "todos" && !showAll
                ? "Selección"
                : "Resultados"}
            </span>

            <p
              className="
                mt-1
                text-[13px]
                font-semibold
                text-[#536872]
              "
            >
              {activeFilter === "todos" && !showAll
                ? "Programas destacados"
                : `${filteredPrograms.length} ${
                    filteredPrograms.length === 1
                      ? "programa disponible"
                      : "programas disponibles"
                  }`}
            </p>
          </div>

          {activeFilter !== "todos" && (
            <button
              type="button"
              onClick={() => handleFilter("todos")}
              className="
                group/clear
                flex
                items-center
                gap-2

                text-[11px]
                font-bold
                text-[#6c7d84]

                transition-colors
                duration-200

                hover:text-[#d85f00]
              "
            >
              <span
                className="
                  grid
                  h-5
                  w-5
                  place-items-center
                  rounded-full
                  border
                  border-[#dce3e4]

                  transition-all
                  duration-200

                  group-hover/clear:border-[#f3bd91]
                  group-hover/clear:bg-[#fff5ed]
                "
              >
                ×
              </span>

              Limpiar filtro
            </button>
          )}
        </div>

        {/* ===================================================
            PROGRAM CARDS
        ==================================================== */}

        <div
          className="
            mt-5
            grid
            gap-6

            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          {visiblePrograms.map((program, index) => (
            <div
              key={`${program.title}-${program.audience}`}
              className="
                animate-[programAppear_.4s_ease-out_both]
              "
              style={{
                animationDelay: `${index * 45}ms`,
              }}
            >
              <ProgramCard
                program={program}
                whatsappUrl={WHATSAPP_URL}
              />
            </div>
          ))}
        </div>

        {/* ===================================================
            SHOW ALL
        ==================================================== */}

        {activeFilter === "todos" &&
          filteredPrograms.length > 3 && (
            <div
              className="
                mt-10
                flex
                flex-col
                items-center
              "
            >
              <button
                type="button"
                onClick={() =>
                  setShowAll((current) => !current)
                }
                aria-expanded={showAll}
                className="
                  group/expand

                  inline-flex
                  min-h-[50px]
                  items-center
                  justify-center
                  gap-3
                  rounded-full

                  border
                  border-[#d6dfe1]
                  bg-white
                  px-6

                  text-[12px]
                  font-bold
                  text-[#173447]

                  shadow-[0_5px_18px_rgba(15,23,42,.04)]

                  transition-all
                  duration-300

                  hover:-translate-y-0.5
                  hover:border-[#f1b685]
                  hover:text-[#d85f00]
                  hover:shadow-[0_10px_25px_rgba(15,23,42,.07)]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#ff7100]/30
                  focus-visible:ring-offset-2
                "
              >
                <span>
                  {showAll
                    ? "Mostrar menos"
                    : `Explorar los ${filteredPrograms.length} programas`}
                </span>

                <span
                  className={`
                    grid
                    h-7
                    w-7
                    place-items-center
                    rounded-full

                    bg-[#fff2e8]
                    text-[#e26705]

                    transition-all
                    duration-300

                    group-hover/expand:bg-[#ffe6d2]

                    ${showAll ? "rotate-180" : ""}
                  `}
                >
                  ↓
                </span>
              </button>

              {!showAll && (
                <p
                  className="
                    mt-3
                    max-w-[360px]
                    text-center
                    text-[10px]
                    leading-[1.5]
                    text-[#929ea3]
                  "
                >
                  También puedes usar los filtros para encontrar
                  rápidamente el programa que mejor se adapta a tu
                  objetivo.
                </p>
              )}
            </div>
          )}

        {/* ===================================================
            BOTTOM SIGNATURE
        ==================================================== */}

        <div
          className="
            mt-14
            flex
            items-center
            gap-4
          "
        >
          <div className="h-px flex-1 bg-[#e1e6e6]" />

          <div className="flex items-center gap-2.5">
            <span
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-[#ff7100]
              "
            />

            <span
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[.12em]
                text-[#98a4a9]
              "
            >
              English for the real world
            </span>
          </div>

          <div className="h-px flex-1 bg-[#e1e6e6]" />
        </div>
      </div>

      {/* =====================================================
          ANIMATION
      ====================================================== */}

      <style>
        {`
          @keyframes programAppear {
            from {
              opacity: 0;
              transform: translateY(10px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            [class*="programAppear"] {
              animation: none !important;
            }
          }
        `}
      </style>
    </section>
  );
}