import { Icon } from "@/components/ui/core/Icon";

export type PricingPackage = {
  name: string;
  hours: number;
  regularPrice: number;
  price: number;
  savings: number;
  discount?: string;
  featured?: boolean;
  premium?: boolean;
};

type PricingCardProps = {
  pack: PricingPackage;
  whatsappUrl: string;
};

export function PricingCard({
  pack,
  whatsappUrl,
}: PricingCardProps) {
  const pricePerHour = Math.round(pack.price / pack.hours);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[24px] border p-6 transition-all duration-300 hover:-translate-y-1.5 ${
        pack.premium
          ? "border-[#173f56] bg-[#0b273b] text-white shadow-[0_22px_60px_rgba(11,39,59,.18)]"
          : pack.featured
            ? "border-[#9bcdd7] bg-white shadow-[0_18px_45px_rgba(15,23,42,.10)]"
            : "border-[#dce4e7] bg-white text-[#102f43] shadow-[0_8px_30px_rgba(15,23,42,.04)] hover:border-[#bdd0d6] hover:shadow-[0_20px_45px_rgba(15,23,42,.09)]"
      }`}
    >
      {pack.featured && (
        <div className="absolute right-4 top-4 rounded-full bg-[#e4f5f7] px-3 py-2 text-[9px] font-bold uppercase tracking-[.09em] text-[#17677d]">
          Más elegido
        </div>
      )}

      {pack.premium && (
        <div className="absolute right-4 top-4 rounded-full bg-[#f4a261] px-3 py-2 text-[9px] font-bold uppercase tracking-[.09em] text-[#182d38]">
          Mejor valor
        </div>
      )}

      <div
        className={`text-[11px] font-bold uppercase tracking-[.1em] ${
          pack.premium ? "text-[#8ed8e5]" : "text-[#118AB2]"
        }`}
      >
        {pack.name}
      </div>

      <div className="mt-8">
        <span className="text-[45px] font-bold tracking-[-.045em]">
          {pack.hours}
        </span>
        <span
          className={`ml-2 text-[13px] font-medium ${
            pack.premium ? "text-[#b9ccd5]" : "text-[#73838b]"
          }`}
        >
          horas
        </span>
      </div>

      <div className="mt-7">
        <div
          className={`text-[12px] ${
            pack.premium ? "text-[#aebfc8]" : "text-[#84939a]"
          }`}
        >
          Precio regular{" "}
          <span className="line-through">
            S/{pack.regularPrice.toLocaleString("en-US")}
          </span>
        </div>

        <div className="mt-2 flex items-end gap-1">
          <span className="mb-1 text-[15px] font-bold">S/</span>
          <span className="text-[38px] font-bold leading-none tracking-[-.04em]">
            {pack.price.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div
        className={`mt-5 rounded-[14px] p-4 ${
          pack.premium
            ? "bg-white/[.07]"
            : "bg-[#f2f7f8]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon
            name="check-circle"
            size={17}
            color={pack.premium ? "#8ed8e5" : "#118AB2"}
          />

          <span
            className={`text-[12px] font-bold ${
              pack.premium ? "text-white" : "text-[#244c61]"
            }`}
          >
            Ahorras S/{pack.savings}
          </span>
        </div>

        <div
          className={`mt-2 text-[11px] ${
            pack.premium ? "text-[#b7c8d0]" : "text-[#74868e]"
          }`}
        >
          Aproximadamente S/{pricePerHour} por hora
        </div>
      </div>

      {pack.discount && (
        <div
          className={`mt-4 text-[12px] font-bold ${
            pack.premium ? "text-[#f4b77d]" : "text-[#118AB2]"
          }`}
        >
          {pack.discount}
        </div>
      )}

      <div className="mt-auto pt-7">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-[48px] items-center justify-between rounded-[14px] px-4 text-[13px] font-bold transition-all duration-300 ${
            pack.premium
              ? "bg-white text-[#102f43] hover:bg-[#f2f7f8]"
              : "border border-[#d7e2e5] bg-white text-[#173447] hover:border-[#aacbd3] hover:bg-[#f7fbfb]"
          }`}
        >
          <span>Elegir paquete</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>
    </article>
  );
}