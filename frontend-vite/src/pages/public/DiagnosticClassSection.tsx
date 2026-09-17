import { Icon } from "@/components/ui/core/Icon";

const WHATSAPP_URL = "https://wa.link/d48tyx";

const ITEMS = [
  {
    icon: "user-focus",
    title: "Evaluación inicial",
    description: "Identificamos tu nivel o partimos desde cero.",
  },
  {
    icon: "chalkboard-teacher",
    title: "Clase personalizada",
    description: "Una sesión 1 a 1 adaptada a tus necesidades.",
  },
  {
    icon: "lightbulb",
    title: "Conoce la metodología",
    description: "Experimenta cómo trabajaremos durante tus clases.",
  },
  {
    icon: "map-trifold",
    title: "Ruta recomendada",
    description: "Recibe una recomendación según tu objetivo.",
  },
];

export function DiagnosticClassSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="overflow-hidden rounded-[30px] border border-[#dce5e8] bg-[#f3f8f9] shadow-[0_20px_70px_rgba(15,23,42,.06)]">
          <div className="grid lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <span className="inline-flex rounded-full bg-[#dff2f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#17677d]">
                Empieza sin compromiso
              </span>

              <h2 className="mt-6 max-w-2xl text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-[#102f43] sm:text-[45px]">
                Conoce a tu profesor antes de elegir un paquete.
              </h2>

              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#627680]">
                Reserva una clase diagnóstica y experimenta una sesión
                personalizada con tu futuro profesor.
              </p>

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="group rounded-[18px] border border-[#dce6e9] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#bdd7dd] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)]"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf6f8] transition-transform duration-300 group-hover:scale-105">
                      <Icon
                        name={item.icon}
                        size={18}
                        color="#118AB2"
                      />
                    </div>

                    <div className="mt-4 text-[14px] font-bold text-[#173447]">
                      {item.title}
                    </div>

                    <p className="mt-1 text-[12px] leading-5 text-[#72838c]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* PRICE SIDE */}
            <div className="relative flex flex-col justify-between overflow-hidden bg-[#0b273b] p-7 sm:p-10 lg:p-12">
              <div
                aria-hidden="true"
                className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#118AB2]/20 blur-3xl"
              />

              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#8ed8e5]">
                  Clase diagnóstica
                </div>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-[19px] font-bold text-white/75">
                    S/
                  </span>
                  <span className="text-[72px] font-bold leading-[.85] tracking-[-.06em] text-white">
                    45
                  </span>
                </div>

                <div className="mt-4 text-[14px] font-medium text-[#bfd0d9]">
                  1 sesión personalizada
                </div>

                <div className="my-8 h-px bg-white/10" />

                <div className="flex gap-3">
                  <Icon
                    name="check-circle"
                    size={20}
                    color="#8ed8e5"
                  />

                  <p className="max-w-sm text-[13px] leading-6 text-[#d4e1e6]">
                    Si decides continuar, los{" "}
                    <strong className="text-white">
                      S/45 se descuentan
                    </strong>{" "}
                    del valor total de tu programa.
                  </p>
                </div>
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-10 flex min-h-[52px] items-center justify-between rounded-[15px] bg-white px-5 text-[14px] font-bold text-[#102f43] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ed8e5]"
              >
                <span>Agendar mi clase</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}