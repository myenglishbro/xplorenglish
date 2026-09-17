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
      className="relative overflow-hidden bg-[#071f30]"
    >
      {/* BACKGROUND DECORATION */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full bg-[#00d5df]/10 blur-[120px]" />
        <div className="absolute -bottom-56 -left-32 h-[520px] w-[520px] rounded-full bg-[#ff7200]/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        {/* HEADER */}
        <div className="grid gap-10 lg:grid-cols-[1fr_.85fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-[3px] w-8 rounded-full bg-[#ff7200]" />

              <span className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#00d5df]">
                Nuestra metodología
              </span>
            </div>

            <h2 className="mt-5 max-w-2xl text-[38px] font-bold leading-[1.04] tracking-[-.045em] text-white sm:text-[48px] lg:text-[54px]">
              Una ruta diseñada
              <br />
              alrededor de{" "}
              <span className="relative inline-block text-[#00d5df]">
                ti.
                <span className="absolute -bottom-2 left-0 h-[4px] w-full rounded-full bg-[#ff7200]" />
              </span>
            </h2>

            <p className="mt-7 max-w-xl text-[15px] leading-7 text-[#a9beca]">
              No aplicamos una fórmula idéntica para todos. Partimos de tus
              objetivos y adaptamos el proceso conforme avanzas.
            </p>
          </div>

          {/* SCHEDULE BENEFIT */}
          <div className="lg:flex lg:justify-end">
            <div className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[.055] p-6 backdrop-blur-sm">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[80px] bg-[#ff7200]/10" />

              <div className="relative flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[#ff7200] shadow-[0_10px_30px_rgba(255,114,0,.25)]">
                  <Icon name="clock" size={21} color="#ffffff" />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[.15em] text-[#00d5df]">
                    Tú eliges cuándo aprender
                  </div>

                  <div className="mt-2 text-[19px] font-bold tracking-[-.02em] text-white">
                    Horarios que se adaptan a ti
                  </div>

                  <p className="mt-2 text-[13px] leading-6 text-[#a9beca]">
                    Programa tus clases según tu disponibilidad.
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#00d5df]/20 bg-[#00d5df]/10 px-4 py-2">
                    <span className="h-2 w-2 rounded-full bg-[#00d5df]" />
                    <span className="text-[12px] font-bold text-[#dffcff]">
                      6:00 a. m. – 10:00 p. m. · Lunes a domingo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP NAVIGATION */}
        <div className="relative mt-16">
          {/* Desktop connector */}
          <div className="absolute left-[12.5%] right-[12.5%] top-[31px] hidden h-px bg-white/10 lg:block" />

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const selected = activeStep === index;

              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  onMouseEnter={() => setActiveStep(index)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-[22px] border p-5 text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#00d5df] ${
                    selected
                      ? "border-[#ff7200]/60 bg-white text-[#0b273b] shadow-[0_20px_55px_rgba(0,0,0,.28)] -translate-y-1"
                      : "border-white/10 bg-[#0c2b40]/80 text-white hover:-translate-y-1 hover:border-[#00d5df]/30 hover:bg-[#10344c]"
                  }`}
                >
                  {/* Active orange top line */}
                  <div
                    className={`absolute left-0 top-0 h-[4px] w-full transition-opacity ${
                      selected ? "bg-[#ff7200] opacity-100" : "opacity-0"
                    }`}
                  />

                  <div className="flex items-center justify-between">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-[15px] transition-all ${
                        selected
                          ? "bg-[#ff7200] shadow-[0_8px_24px_rgba(255,114,0,.22)]"
                          : "border border-white/10 bg-white/[.06]"
                      }`}
                    >
                      <Icon
                        name={step.icon}
                        size={20}
                        color={selected ? "#ffffff" : "#00d5df"}
                      />
                    </div>

                    <span
                      className={`text-[12px] font-black tracking-[.14em] ${
                        selected ? "text-[#ff7200]" : "text-[#5e8799]"
                      }`}
                    >
                      {step.number}
                    </span>
                  </div>

                  <div className="mt-7 text-[18px] font-bold tracking-[-.02em]">
                    {step.title}
                  </div>

                  <div
                    className={`mt-2 min-h-[40px] text-[13px] leading-5 ${
                      selected ? "text-[#637783]" : "text-[#9eb2bd]"
                    }`}
                  >
                    {step.short}
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <span
                      className={`h-[3px] rounded-full transition-all duration-300 ${
                        selected
                          ? "w-9 bg-[#ff7200]"
                          : "w-4 bg-[#00d5df]/40 group-hover:w-7"
                      }`}
                    />

                    {selected && (
                      <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#ff7200]">
                        Explorar
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE CONTENT */}
        <div className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[#0c2b40] shadow-[0_30px_80px_rgba(0,0,0,.18)]">
          <div className="grid lg:grid-cols-[.88fr_1.12fr]">
            {/* TEXT */}
            <div className="relative flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <div className="absolute left-0 top-14 h-16 w-[4px] rounded-r-full bg-[#ff7200]" />

              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#00d5df]/20 bg-[#00d5df]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#00d5df]">
                  Paso {active.number}
                </span>
              </div>

              <h3 className="mt-5 text-[30px] font-bold tracking-[-.035em] text-white sm:text-[34px]">
                {active.title}
              </h3>

              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#b3c6cf]">
                {active.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {active.features.map((feature) => (
                  <span
                    key={feature}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-4 py-2.5 text-[12px] font-semibold text-[#dce8ed]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff7200]" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* IMAGE */}
            <div className="relative min-h-[320px] overflow-hidden lg:min-h-[430px]">
              <img
                src="https://lewis-school.co.uk/wp-content/uploads/2022/03/young-lady-online700x700.jpg"
                alt="Clase personalizada de inglés online"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#0c2b40]/55 via-[#0c2b40]/10 to-transparent lg:from-[#0c2b40]/70" />

              {/* FLOATING BRAND CARD */}
              <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-[330px]">
                <div className="overflow-hidden rounded-[20px] border border-white/30 bg-white/[.94] shadow-[0_18px_45px_rgba(0,0,0,.22)] backdrop-blur-xl">
                  <div className="h-[4px] w-full bg-[#ff7200]" />

                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#071f30]">
                        <span className="text-[13px] font-black text-[#00d5df]">
                          X
                        </span>
                      </div>

                      <div className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff7200]">
                        X-plore English
                      </div>
                    </div>

                    <div className="mt-3 text-[15px] font-bold leading-6 text-[#102f43]">
                      Tu aprendizaje. Tu ritmo. Tu objetivo.
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#667b86]">
                      <span className="h-2 w-2 rounded-full bg-[#00d5df]" />
                      Metodología personalizada 1 a 1
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BRAND ACCENT */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-[#ff7200]" />
            <span className="h-1.5 w-3 rounded-full bg-[#00d5df]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </section>
  );
}