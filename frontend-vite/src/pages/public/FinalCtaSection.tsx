import { Icon } from "@/components/ui/core/Icon";

const WHATSAPP_URL = "https://wa.link/d48tyx";

export function FinalCtaSection() {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#0b273b] px-7 py-14 sm:px-10 lg:px-16 lg:py-16">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-48 h-[500px] w-[500px] rounded-full bg-[#118AB2]/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#f4a261]/10 blur-3xl"
        />

        <div className="relative grid gap-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#8ed8e5]">
              Tu próximo paso
            </span>

            <h2 className="mt-4 max-w-2xl text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-white sm:text-[45px]">
              Empieza con una clase diseñada para ti.
            </h2>

            <p className="mt-5 max-w-xl text-[14px] leading-7 text-[#bfd0d9]">
              Cuéntanos qué quieres lograr y te ayudaremos a encontrar el
              programa y la ruta más adecuada.
            </p>
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[56px] min-w-[220px] items-center justify-between gap-6 rounded-[16px] bg-white px-6 text-[14px] font-bold text-[#102f43] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ed8e5]"
          >
            <span>Hablar con X-plore</span>

            <Icon
              name="arrow-right"
              size={17}
              color="#118AB2"
            />
          </a>
        </div>
      </div>
    </section>
  );
}