import {
  PricingCard,
  type PricingPackage,
} from "./PricingCard";

const WHATSAPP_URL = "https://wa.link/d48tyx";

const PACKAGES: PricingPackage[] = [
  {
    name: "Pack 8",
    hours: 8,
    regularPrice: 360,
    price: 296,
    savings: 64,
  },
  {
    name: "Pack 12",
    hours: 12,
    regularPrice: 540,
    price: 420,
    savings: 120,
  },
  {
    name: "Pack 20",
    hours: 20,
    regularPrice: 900,
    price: 660,
    savings: 240,
    featured: true,
  },
  {
    name: "Pack 40",
    hours: 40,
    regularPrice: 1800,
    price: 1300,
    savings: 500,
    discount: "28% OFF",
  },
  {
    name: "Programa 60",
    hours: 60,
    regularPrice: 2700,
    price: 1800,
    savings: 900,
    discount: "33% OFF",
    premium: true,
  },
];

export function PricingSection() {
  return (
    <section id="precios" className="bg-[#f5f8f8]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-[#118AB2]">
            Paquetes
          </div>

          <h2 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-[#102f43] sm:text-[46px]">
            Invierte en tu inglés a tu propio ritmo.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#657780]">
            Todas las clases son individuales. Mientras mayor sea tu paquete,
            menor será el costo efectivo por hora.
          </p>
        </div>

        {/* SINGLE CLASS */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col justify-between gap-5 rounded-[22px] border border-[#dbe5e8] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,.04)] sm:flex-row sm:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[#118AB2]">
              Sin paquete
            </div>

            <div className="mt-2 text-[19px] font-bold text-[#173447]">
              Clase individual
            </div>

            <p className="mt-1 text-[12px] text-[#73838b]">
              Ideal para una sesión puntual.
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-[34px] font-bold tracking-[-.04em] text-[#102f43]">
              S/45
            </span>
            <span className="ml-2 text-[12px] text-[#75858d]">
              por hora
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((pack) => (
            <PricingCard
              key={pack.name}
              pack={pack}
              whatsappUrl={WHATSAPP_URL}
            />
          ))}
        </div>
      </div>
    </section>
  );
}