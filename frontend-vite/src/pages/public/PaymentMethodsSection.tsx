import { useState } from "react";
import { Icon } from "@/components/ui/core/Icon";

const PAYMENT_METHODS = [
  {
    id: "bcp",
    name: "BCP",
    label: "Cuenta",
    value: "194-97829356-0-28",
  },
  {
    id: "interbank",
    name: "Interbank",
    label: "Cuenta corriente",
    value: "200-3007062506",
  },
  {
    id: "scotiabank",
    name: "Scotiabank",
    label: "Cuenta",
    value: "0487595050",
  },
  {
    id: "yape",
    name: "Yape / Plin",
    label: "Número",
    value: "999702190",
  },
];

export function PaymentMethodsSection() {
  const [selected, setSelected] = useState("bcp");

  const current =
    PAYMENT_METHODS.find((method) => method.id === selected) ??
    PAYMENT_METHODS[0];

  return (
    <section className="bg-[#f5f8f9]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[.11em] text-[#118AB2]">
              Pagos
            </span>

            <h2 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-.035em] text-[#102f43]">
              Métodos de pago
            </h2>

            <p className="mt-4 max-w-md text-[14px] leading-6 text-[#6d7e87]">
              Selecciona un método para consultar los datos correspondientes.
            </p>

            <div className="mt-7 rounded-[18px] border border-[#dce6e8] bg-white p-5">
              <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#829098]">
                Titular de la cuenta
              </div>

              <div className="mt-3 text-[14px] font-bold text-[#173447]">
                Sandra Casanova
              </div>

              <div className="mt-1 text-[12px] text-[#687b84]">
                X-plore English E.I.R.L.
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#dce5e8] bg-white shadow-[0_14px_45px_rgba(15,23,42,.05)]">
            {/* SELECTOR */}
            <div className="grid grid-cols-2 border-b border-[#e5eaec] sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => {
                const active = selected === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelected(method.id)}
                    className={`relative min-h-[68px] px-3 text-[12px] font-bold transition-colors ${
                      active
                        ? "bg-[#f1f8f9] text-[#12657b]"
                        : "bg-white text-[#6c7b83] hover:bg-[#fafcfc] hover:text-[#173447]"
                    }`}
                  >
                    {method.name}

                    {active && (
                      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#118AB2]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* RESULT */}
            <div className="p-7 sm:p-9">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#eaf6f8]">
                  <Icon
                    name="wallet"
                    size={21}
                    color="#118AB2"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-[#829199]">
                    {current.label}
                  </div>

                  <div className="mt-2 break-all text-[22px] font-bold tracking-[-.02em] text-[#173447] sm:text-[25px]">
                    {current.value}
                  </div>

                  <div className="mt-2 text-[12px] text-[#71838c]">
                    {current.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6ecee] bg-[#f8fbfb] p-6">
              <div className="flex gap-3">
                <Icon
                  name="credit-card"
                  size={18}
                  color="#118AB2"
                />

                <div className="text-[11px] leading-5 text-[#667982]">
                  <strong className="text-[#173447]">
                    Pagos con tarjeta:
                  </strong>{" "}
                  disponibles con un recargo del 5% para pagos realizados
                  desde Perú.
                </div>
              </div>

              <div className="mt-3 flex gap-3">
                <Icon
                  name="globe"
                  size={18}
                  color="#118AB2"
                />

                <div className="text-[11px] leading-5 text-[#667982]">
                  <strong className="text-[#173447]">
                    Pagos internacionales:
                  </strong>{" "}
                  disponibles mediante PayPal y Western Union. Pueden aplicar
                  recargos por comisión según la plataforma.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}