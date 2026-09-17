import { useState } from "react";
import { Icon } from "@/components/ui/core/Icon";

const TESTIMONIALS = [
  {
    quote:
      "Las clases se adaptaron completamente a lo que necesitaba. Pude enfocarme en conversación y sentirme mucho más segura al hablar.",
    name: "Estudiante de inglés",
    program: "Inglés Conversacional",
  },
  {
    quote:
      "La atención personalizada hizo una gran diferencia. Tener una ruta clara me permitió identificar qué debía mejorar en cada etapa.",
    name: "Estudiante de inglés",
    program: "Programa personalizado",
  },
  {
    quote:
      "La flexibilidad de horarios y el acompañamiento individual hicieron que pudiera mantener continuidad incluso con mi trabajo.",
    name: "Estudiante profesional",
    program: "Inglés para Profesionales",
  },
];

export function TestimonialsSection() {
  const [active, setActive] = useState(0);

  const testimonial = TESTIMONIALS[active];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[.11em] text-[#118AB2]">
            Experiencias
          </span>

          <h2 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-[#102f43] sm:text-[44px]">
            Aprender inglés también debe sentirse diferente.
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-[28px] border border-[#dce5e8] bg-[#f7fafb] p-7 sm:p-10 lg:p-12">
          <Icon
            name="quotes"
            size={30}
            color="#118AB2"
          />

          <blockquote className="mt-7 text-[21px] font-medium leading-[1.6] tracking-[-.015em] text-[#244657] sm:text-[25px]">
            “{testimonial.quote}”
          </blockquote>

          <div className="mt-8 flex flex-col justify-between gap-5 border-t border-[#dde6e9] pt-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-[13px] font-bold text-[#173447]">
                {testimonial.name}
              </div>
              <div className="mt-1 text-[11px] text-[#778890]">
                {testimonial.program}
              </div>
            </div>

            <div className="flex gap-2">
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Ver testimonio ${index + 1}`}
                  aria-pressed={active === index}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    active === index
                      ? "w-8 bg-[#118AB2]"
                      : "w-2.5 bg-[#cad7dc] hover:bg-[#9fb8c1]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}