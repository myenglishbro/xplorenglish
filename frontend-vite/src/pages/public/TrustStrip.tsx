import { Icon } from "@/components/ui/core/Icon";

const ITEMS = [
  {
    icon: "user",
    value: "1 a 1",
    label: "Clases individuales",
  },
  {
    icon: "calendar",
    value: "Flexible",
    label: "Horarios adaptables",
  },
  {
    icon: "target",
    value: "Personalizado",
    label: "Según tus objetivos",
  },
  {
    icon: "laptop",
    value: "Online",
    label: "Aprende donde estés",
  },
];

export function TrustStrip() {
  return (
    <section className="border-y border-[#e6ecee] bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
        {ITEMS.map((item, index) => (
          <div
            key={item.label}
            className={`flex items-center gap-4 py-6 sm:px-5 ${
              index % 2 !== 0 ? "pl-5" : ""
            } lg:border-r lg:border-[#e7ecee] lg:last:border-r-0`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f8]">
              <Icon
                name={item.icon}
                size={18}
                color="#118AB2"
              />
            </div>

            <div>
              <div className="text-[13px] font-bold text-[#173447]">
                {item.value}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-[#7b8a91]">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}