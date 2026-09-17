import { useState } from "react";
import { Icon } from "@/components/ui/core/Icon";

const PAYMENT_METHODS = [
  {
    id: "bcp",
    name: "BCP",
    shortName: "BCP",
    label: "Número de cuenta",
    value: "194-97829356-0-28",
    icon: "bank",
  },
  {
    id: "interbank",
    name: "Interbank",
    shortName: "Interbank",
    label: "Cuenta corriente",
    value: "200-3007062506",
    icon: "bank",
  },
  {
    id: "scotiabank",
    name: "Scotiabank",
    shortName: "Scotiabank",
    label: "Número de cuenta",
    value: "0487595050",
    icon: "bank",
  },
  {
    id: "yape",
    name: "Yape / Plin",
    shortName: "Yape / Plin",
    label: "Número",
    value: "999702190",
    icon: "device-mobile",
  },
];

export function PaymentMethodsSection() {
  const [selected, setSelected] = useState("bcp");
  const [copied, setCopied] = useState(false);

  const current =
    PAYMENT_METHODS.find((method) => method.id === selected) ??
    PAYMENT_METHODS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.value);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelected(id);
    setCopied(false);
  };

  return (
    <section className="relative overflow-hidden bg-[#f5f8f9]">
      {/* BACKGROUND DECORATION */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-[#00d5df]/[.06] blur-[100px]" />
        <div className="absolute -bottom-52 -left-32 h-[420px] w-[420px] rounded-full bg-[#ff7200]/[.05] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        {/* HEADER */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[3px] w-7 rounded-full bg-[#ff7200]" />

            <span className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#118AB2]">
              Pagos
            </span>

            <span className="h-[3px] w-7 rounded-full bg-[#00d5df]" />
          </div>

          <h2 className="mt-5 text-[36px] font-bold leading-[1.06] tracking-[-.04em] text-[#0b273b] sm:text-[46px]">
            Elige cómo realizar
            <br className="hidden sm:block" /> tu pago.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 text-[#687d88]">
            Selecciona tu método de pago y encontrarás los datos
            correspondientes para completar tu inscripción.
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[30px] border border-[#dce6e9] bg-white shadow-[0_25px_70px_rgba(11,39,59,.08)]">
          {/* PAYMENT SELECTOR */}
          <div className="border-b border-[#e4ebed] bg-[#fbfcfc] p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => {
                const active = selected === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleSelect(method.id)}
                    aria-pressed={active}
                    className={`group relative flex min-h-[82px] items-center gap-3 overflow-hidden rounded-[16px] border px-4 text-left transition-all duration-300 ${
                      active
                        ? "border-[#ff7200]/40 bg-[#fff8f2] shadow-[0_8px_24px_rgba(255,114,0,.08)]"
                        : "border-transparent bg-transparent hover:border-[#dce7ea] hover:bg-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#ff7200]" />
                    )}

                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] transition-colors ${
                        active
                          ? "bg-[#ff7200]"
                          : "bg-[#eaf6f8] group-hover:bg-[#dff3f6]"
                      }`}
                    >
                      <Icon
                        name={method.icon}
                        size={18}
                        color={active ? "#ffffff" : "#118AB2"}
                      />
                    </div>

                    <div>
                      <div
                        className={`text-[12px] font-bold ${
                          active ? "text-[#0b273b]" : "text-[#647984]"
                        }`}
                      >
                        {method.shortName}
                      </div>

                      <div
                        className={`mt-1 text-[9px] font-bold uppercase tracking-[.1em] ${
                          active ? "text-[#ff7200]" : "text-[#9aa9af]"
                        }`}
                      >
                        {active ? "Seleccionado" : "Seleccionar"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAYMENT INFORMATION */}
          <div className="grid lg:grid-cols-[1.25fr_.75fr]">
            {/* ACCOUNT */}
            <div className="p-7 sm:p-10 lg:p-12">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#118AB2]">
                  {current.name}
                </span>

                <span className="h-px flex-1 bg-[#e3eaec]" />
              </div>

              <div className="mt-8">
                <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#87979f]">
                  {current.label}
                </div>

                <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="break-all text-[27px] font-bold tracking-[-.035em] text-[#0b273b] sm:text-[32px]">
                    {current.value}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] px-5 text-[11px] font-bold transition-all ${
                      copied
                        ? "bg-[#00d5df]/10 text-[#087d89]"
                        : "bg-[#0b273b] text-white hover:bg-[#123b54]"
                    }`}
                  >
                    <Icon
                      name={copied ? "check" : "copy"}
                      size={15}
                      color={copied ? "#087d89" : "#ffffff"}
                    />

                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* HOLDER */}
              <div className="mt-9 border-t border-[#e5ebed] pt-7">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#e9f7f8]">
                    <Icon
                      name="user"
                      size={18}
                      color="#118AB2"
                    />
                  </div>

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.13em] text-[#8a999f]">
                      Titular de la cuenta
                    </div>

                    <div className="mt-2 text-[14px] font-bold text-[#173447]">
                      Sandra Casanova
                    </div>

                    <div className="mt-1 text-[12px] text-[#70828b]">
                      X-plore English E.I.R.L.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SIDE PANEL */}
            <div className="relative overflow-hidden bg-[#0b273b] p-7 text-white sm:p-9 lg:p-10">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#00d5df]/10 blur-[60px]"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-[#ff7200]/10 blur-[60px]"
              />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="h-[3px] w-6 rounded-full bg-[#ff7200]" />

                  <span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#00d5df]">
                    Otras opciones
                  </span>
                </div>

                {/* CARD PAYMENTS */}
                <div className="mt-7">
                  <div className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[.07]">
                      <Icon
                        name="credit-card"
                        size={18}
                        color="#00d5df"
                      />
                    </div>

                    <div>
                      <div className="text-[13px] font-bold">
                        Pago con tarjeta
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-[#adc1cb]">
                        Disponible para pagos realizados desde Perú con un
                        recargo del 5%.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="my-6 h-px bg-white/10" />

                {/* INTERNATIONAL */}
                <div>
                  <div className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[.07]">
                      <Icon
                        name="globe"
                        size={18}
                        color="#00d5df"
                      />
                    </div>

                    <div>
                      <div className="text-[13px] font-bold">
                        Pagos internacionales
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-[#adc1cb]">
                        Puedes pagar mediante PayPal o Western Union.
                        Las comisiones dependen de cada plataforma.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECURITY / NOTE */}
                <div className="mt-8 rounded-[16px] border border-white/10 bg-white/[.055] p-4">
                  <div className="flex gap-3">
                    <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-[#ff7200]" />

                    <p className="text-[10px] leading-5 text-[#c5d5dc]">
                      Verifica los datos antes de realizar la transferencia y
                      conserva tu comprobante de pago.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTNOTE */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#82939b]">
            <Icon
              name="shield-check"
              size={14}
              color="#118AB2"
            />
            Información de pago de X-plore English
          </div>
        </div>
      </div>
    </section>
  );
}