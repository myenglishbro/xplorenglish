import { Icon } from "@/components/ui/core/Icon";

const BENEFITS = [
  {
    icon: "video-camera",
    title: "Clases 1 a 1 online",
    description:
      "Atención directa y una experiencia completamente personalizada.",
  },
  {
    icon: "user-sound",
    title: "Enfoque según tu necesidad",
    description:
      "Speaking, Listening, Grammar y Vocabulary según tus objetivos.",
  },
  {
    icon: "calendar",
    title: "Horarios flexibles",
    description:
      "Organiza tus sesiones de acuerdo con tu disponibilidad.",
  },
  {
    icon: "book-open",
    title: "Material digital incluido",
    description:
      "Recursos seleccionados y adaptados a tu proceso de aprendizaje.",
  },
];

export function PackageBenefitsSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[.11em] text-[#118AB2]">
              Incluido
            </span>

            <h2 className="mt-4 max-w-md text-[32px] font-bold leading-[1.1] tracking-[-.03em] text-[#102f43] sm:text-[39px]">
              Mucho más que horas de clase.
            </h2>

            <p className="mt-5 max-w-md text-[14px] leading-7 text-[#687b84]">
              Cada paquete incluye los elementos necesarios para que tu
              aprendizaje tenga continuidad y dirección.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className="group rounded-[20px] border border-[#e0e7e9] bg-[#fafcfc] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#bed5da] hover:bg-white hover:shadow-[0_14px_35px_rgba(15,23,42,.07)]"
              >
                <div className="grid h-11 w-11 place-items-center rounded-[13px] bg-[#e9f5f7] transition-transform duration-300 group-hover:scale-105">
                  <Icon
                    name={benefit.icon}
                    size={20}
                    color="#118AB2"
                  />
                </div>

                <h3 className="mt-5 text-[15px] font-bold text-[#173447]">
                  {benefit.title}
                </h3>

                <p className="mt-2 text-[12px] leading-5 text-[#71828a]">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}