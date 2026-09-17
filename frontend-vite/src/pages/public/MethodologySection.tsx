import { useState } from "react";
import { Icon } from "@/components/ui/core/Icon";

const STEPS = [
  {
    number: "01",
    icon: "magnifying-glass",
    title: "Diagnóstico",
    short: "Conocemos tu punto de partida.",
    description:
      "Identificamos tu nivel actual, objetivos, disponibilidad y las habilidades que necesitan mayor atención.",
    features: ["Nivel actual", "Objetivos", "Necesidades"],
  },
  {
    number: "02",
    icon: "sliders-horizontal",
    title: "Personalización",
    short: "Diseñamos una ruta para ti.",
    description:
      "Tu profesor adapta contenidos, actividades, ritmo y materiales según tus necesidades y objetivos.",
    features: ["Ruta individual", "Ritmo propio", "Material adaptado"],
  },
  {
    number: "03",
    icon: "chats-circle",
    title: "Clases",
    short: "Usas el inglés desde el inicio.",
    description:
      "Trabajamos el idioma de forma práctica mediante comunicación, tareas reales y situaciones relevantes para ti.",
    features: ["Clases 1 a 1", "Comunicación", "Situaciones reales"],
  },
  {
    number: "04",
    icon: "chart-line-up",
    title: "Seguimiento",
    short: "Medimos y ajustamos tu progreso.",
    description:
      "Recibes retroalimentación continua para identificar avances, corregir dificultades y ajustar tu ruta.",
    features: ["Feedback", "Progreso", "Ajustes continuos"],
  },
];

export function MethodologySection() {
  const [activeStep, setActiveStep] = useState(0);

  const active = STEPS[activeStep];

  return (
    <section
      id="metodologia"
      className="relative overflow-hidden bg-[#0b273b]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#118AB2]/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-[#71c9dc]" />
              <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#8ed8e5]">
                Nuestra metodología
              </span>
            </div>

            <h2 className="mt-4 max-w-xl text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-white sm:text-[44px]">
              Una ruta diseñada alrededor de ti.
            </h2>
          </div>

          <p className="max-w-xl text-[15px] leading-7 text-[#bfd0d9] lg:ml-auto">
            No aplicamos una fórmula idéntica para todos. Partimos de tus
            objetivos y ajustamos el proceso conforme avanzas.
          </p>
        </div>

        {/* STEPS */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const selected = activeStep === index;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                onMouseEnter={() => setActiveStep(index)}
                aria-pressed={selected}
                className={`group rounded-[20px] border p-5 text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#71c9dc] ${
                  selected
                    ? "border-white/80 bg-white text-[#102f43] shadow-[0_18px_45px_rgba(0,0,0,.18)]"
                    : "border-white/10 bg-white/[.045] text-white hover:border-white/20 hover:bg-white/[.075]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold tracking-[.12em] ${
                      selected ? "text-[#118AB2]" : "text-[#79c9d9]"
                    }`}
                  >
                    {step.number}
                  </span>

                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                      selected ? "bg-[#eaf6f8]" : "bg-white/[.07]"
                    }`}
                  >
                    <Icon
                      name={step.icon}
                      size={17}
                      color={selected ? "#118AB2" : "#9edbe5"}
                    />
                  </div>
                </div>

                <div className="mt-7 text-[18px] font-bold">{step.title}</div>

                <div
                  className={`mt-2 text-[13px] leading-5 ${
                    selected ? "text-[#657780]" : "text-[#aebfc8]"
                  }`}
                >
                  {step.short}
                </div>

                <div
                  className={`mt-5 h-[3px] origin-left rounded-full transition-all duration-300 ${
                    selected
                      ? "scale-x-100 bg-[#118AB2]"
                      : "scale-x-0 bg-[#118AB2]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ACTIVE CONTENT */}
        <div className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#102f45]">
          <div className="grid lg:grid-cols-[.9fr_1.1fr]">
            <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold uppercase tracking-[.12em] text-[#7fd2e0]">
                  Paso {active.number}
                </span>
              </div>

              <h3 className="mt-3 text-[27px] font-bold tracking-[-.025em] text-white">
                {active.title}
              </h3>

              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#bdced7]">
                {active.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {active.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/10 bg-white/[.055] px-4 py-2 text-[12px] font-semibold text-[#d7e5eb]"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative min-h-[290px] overflow-hidden lg:min-h-[380px]">
              <img
                src="https://lewis-school.co.uk/wp-content/uploads/2022/03/young-lady-online700x700.jpg"
                alt="Clase personalizada de inglés online"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#102f45]/45 to-transparent lg:from-[#102f45]/70" />

              <div className="absolute bottom-6 left-6 right-6 rounded-[18px] border border-white/30 bg-white/90 p-5 shadow-xl backdrop-blur-md">
                <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[#118AB2]">
                  X-plore English
                </div>

                <div className="mt-2 text-[15px] font-bold text-[#173447]">
                  La metodología se adapta al estudiante.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}